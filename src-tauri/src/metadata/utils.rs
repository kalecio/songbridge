use base64::Engine;
use symphonia::core::meta::{MetadataRevision, StandardTagKey};

pub fn apply_tags_from_revision(
    revision: &MetadataRevision,
    title: &mut Option<String>,
    artist: &mut Option<String>,
    album: &mut Option<String>,
    year: &mut Option<String>,
) {
    for tag in revision.tags().iter() {
        println!("{:?}", tag);
        match tag.std_key {
            Some(StandardTagKey::TrackTitle) if title.is_none() => {
                *title = Some(tag.value.to_string())
            }
            Some(StandardTagKey::Artist) if artist.is_none() => {
                *artist = Some(tag.value.to_string())
            }
            Some(StandardTagKey::Album) if album.is_none() => *album = Some(tag.value.to_string()),
            Some(StandardTagKey::Date) if year.is_none() => *year = Some(tag.value.to_string()),
            _ => {}
        }
    }
}

/// Extracts album art from the metadata and returns it as a base64-encoded string.
pub fn extract_album_art(
    format: &mut dyn symphonia::core::formats::FormatReader,
) -> Option<String> {
    // Access metadata - get visuals from latest revision
    let mut meta = format.metadata();
    let revision_opt = if let Some(cur) = meta.current() {
        Some(cur)
    } else {
        meta.skip_to_latest()
    };
    if let Some(revision) = revision_opt {
        // Get the first visual (typically album art/cover image)
        if let Some(visual) = revision.visuals().first() {
            let base64_image = base64::engine::general_purpose::STANDARD.encode(&visual.data);
            let mime_type = determine_mime_type(&visual.data);
            return Some(format!("data:{};base64,{}", mime_type, base64_image));
        }
    }

    None
}

pub fn extract_album_art_probed(
    metadata: &mut symphonia::core::probe::ProbedMetadata,
) -> Option<String> {
    if let Some(mut meta) = metadata.get() {
        if let Some(revision) = meta.skip_to_latest() {
            if let Some(visual) = revision.visuals().first() {
                let base64_image = base64::engine::general_purpose::STANDARD.encode(&visual.data);
                let mime_type = determine_mime_type(&visual.data);
                return Some(format!("data:{};base64,{}", mime_type, base64_image));
            }
        }
    }
    None
}

/// Determines the MIME type by inferring it from the image data's magic bytes.
pub fn determine_mime_type(data: &[u8]) -> String {
    // Infer MIME type from magic bytes
    if data.len() >= 4 {
        match &data[0..4] {
            [0xFF, 0xD8, 0xFF, _] => "image/jpeg",
            [0x89, 0x50, 0x4E, 0x47] => "image/png",
            [0x47, 0x49, 0x46, 0x38] => "image/gif",
            [0x52, 0x49, 0x46, 0x46] if data.len() >= 12 && &data[8..12] == b"WEBP" => "image/webp",
            _ => "image/jpeg", // Default fallback
        }
    } else {
        "image/jpeg"
    }
    .to_string()
}

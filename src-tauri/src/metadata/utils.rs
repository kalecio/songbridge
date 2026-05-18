use base64::Engine;
use image::codecs::jpeg::JpegEncoder;
use image::imageops::FilterType;
use lofty::config::WriteOptions;
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::picture::{MimeType, Picture, PictureType};
use lofty::prelude::Accessor;
use lofty::probe::Probe;
use lofty::tag::items::Timestamp;
use lofty::tag::Tag;
use symphonia::core::meta::{MetadataRevision, StandardTagKey};

pub fn apply_tags_from_revision(
    revision: &MetadataRevision,
    title: &mut Option<String>,
    artist: &mut Option<String>,
    album: &mut Option<String>,
    year: &mut Option<String>,
    track: &mut Option<u32>,
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
            Some(StandardTagKey::TrackNumber) if track.is_none() => {
                *track = parse_track_number(&tag.value.to_string());
            }
            _ => {}
        }
    }
}

/// ID3 / Vorbis track tags often arrive as "4", "04", or "4/12" (track/total).
/// Take the leading numeric portion and parse it; ignore unparseable values.
fn parse_track_number(raw: &str) -> Option<u32> {
    let head = raw.split('/').next()?.trim();
    head.parse::<u32>().ok()
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

/// What to do with the cover art when writing metadata.
pub enum CoverArtUpdate {
    Keep,
    Remove,
    Replace(Vec<u8>), // already-encoded JPEG bytes
}

/// Load an image from `path`, resize to max 800×800 px, and re-encode as JPEG at 90 % quality.
pub fn process_cover_art(image_path: &str) -> Result<Vec<u8>, String> {
    let img = image::open(image_path).map_err(|e| e.to_string())?;

    let img = if img.width() > 800 || img.height() > 800 {
        img.resize(800, 800, FilterType::Lanczos3)
    } else {
        img
    };

    // JPEG does not support alpha; strip it.
    let rgb = img.to_rgb8();
    let mut output: Vec<u8> = Vec::new();
    JpegEncoder::new_with_quality(&mut output, 90)
        .encode(
            rgb.as_raw(),
            rgb.width(),
            rgb.height(),
            image::ExtendedColorType::Rgb8,
        )
        .map_err(|e| e.to_string())?;

    Ok(output)
}

/// Writes the provided metadata fields back to the audio file's tags using lofty.
/// Fields set to `None` clear the corresponding tag on the file.
pub fn write_metadata_to_file(
    path: &str,
    title: Option<&str>,
    artist: Option<&str>,
    album: Option<&str>,
    year: Option<&str>,
    track: Option<u32>,
    cover_art: CoverArtUpdate,
) -> Result<(), String> {
    let mut tagged_file = Probe::open(path)
        .map_err(|e| e.to_string())?
        .read()
        .map_err(|e| e.to_string())?;

    if tagged_file.primary_tag_mut().is_none() {
        let tag_type = tagged_file.primary_tag_type();
        tagged_file.insert_tag(Tag::new(tag_type));
    }

    let tag = tagged_file
        .primary_tag_mut()
        .ok_or_else(|| "no writable tag found in file".to_string())?;

    match title {
        Some(t) => tag.set_title(t.to_string()),
        None => {
            tag.remove_title();
        }
    }
    match artist {
        Some(a) => tag.set_artist(a.to_string()),
        None => {
            tag.remove_artist();
        }
    }
    match album {
        Some(a) => tag.set_album(a.to_string()),
        None => {
            tag.remove_album();
        }
    }
    match year {
        Some(y) => {
            if let Ok(n) = y.parse::<u16>() {
                tag.set_date(Timestamp {
                    year: n,
                    ..Default::default()
                });
            } else {
                tag.remove_date();
            }
        }
        None => {
            tag.remove_date();
        }
    }
    match track {
        Some(t) => tag.set_track(t),
        None => {
            tag.remove_track();
        }
    }

    match cover_art {
        CoverArtUpdate::Keep => {}
        CoverArtUpdate::Remove => {
            tag.remove_picture_type(PictureType::CoverFront);
        }
        CoverArtUpdate::Replace(jpeg_bytes) => {
            tag.remove_picture_type(PictureType::CoverFront);
            tag.push_picture(
                Picture::unchecked(jpeg_bytes)
                    .pic_type(PictureType::CoverFront)
                    .mime_type(MimeType::Jpeg)
                    .build(),
            );
        }
    }

    tagged_file
        .save_to_path(path, WriteOptions::default())
        .map_err(|e| e.to_string())
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

// ── tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── determine_mime_type ───────────────────────────────────────────────────

    #[test]
    fn mime_jpeg_from_magic_bytes() {
        let data = [0xFF, 0xD8, 0xFF, 0xE0, 0x00];
        assert_eq!(determine_mime_type(&data), "image/jpeg");
    }

    #[test]
    fn mime_png_from_magic_bytes() {
        let data = [0x89, 0x50, 0x4E, 0x47, 0x00];
        assert_eq!(determine_mime_type(&data), "image/png");
    }

    #[test]
    fn mime_gif_from_magic_bytes() {
        // GIF87a and GIF89a both start with 0x47 0x49 0x46 0x38
        let data = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
        assert_eq!(determine_mime_type(&data), "image/gif");
    }

    #[test]
    fn mime_webp_from_magic_bytes() {
        let mut data = vec![0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00];
        data.extend_from_slice(b"WEBP");
        assert_eq!(determine_mime_type(&data), "image/webp");
    }

    #[test]
    fn mime_riff_without_webp_fourcc_falls_back_to_jpeg() {
        // RIFF header but followed by "AVI " instead of "WEBP"
        let mut data = vec![0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00];
        data.extend_from_slice(b"AVI ");
        assert_eq!(determine_mime_type(&data), "image/jpeg");
    }

    #[test]
    fn mime_unknown_bytes_falls_back_to_jpeg() {
        let data = [0xAB, 0xCD, 0xEF, 0x01];
        assert_eq!(determine_mime_type(&data), "image/jpeg");
    }

    #[test]
    fn mime_short_data_falls_back_to_jpeg() {
        assert_eq!(determine_mime_type(&[0xFF, 0xD8, 0xFF]), "image/jpeg");
        assert_eq!(determine_mime_type(&[]), "image/jpeg");
    }

    // ── parse_track_number ────────────────────────────────────────────────────

    #[test]
    fn parse_bare_track_number() {
        assert_eq!(parse_track_number("4"), Some(4));
    }

    #[test]
    fn parse_track_number_with_total() {
        assert_eq!(parse_track_number("4/12"), Some(4));
    }

    #[test]
    fn parse_zero_padded_track_number() {
        assert_eq!(parse_track_number("04"), Some(4));
    }

    #[test]
    fn parse_invalid_track_number_returns_none() {
        assert_eq!(parse_track_number("not-a-number"), None);
        assert_eq!(parse_track_number(""), None);
    }
}

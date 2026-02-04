use songbridge_lib::{
    apply_tags_from_revision, determine_mime_type, extract_album_art_probed, get_audio_probe,
};

#[test]
fn determine_mime_type_jpeg() {
    let data = [0xFFu8, 0xD8, 0xFF, 0xE0, 0x00];
    assert_eq!(determine_mime_type(&data), "image/jpeg".to_string());
}

#[test]
fn determine_mime_type_png() {
    let data = [0x89u8, 0x50, 0x4E, 0x47, 0x00];
    assert_eq!(determine_mime_type(&data), "image/png".to_string());
}

#[test]
fn determine_mime_type_gif() {
    let data = [0x47u8, 0x49, 0x46, 0x38, 0x00];
    assert_eq!(determine_mime_type(&data), "image/gif".to_string());
}

#[test]
fn determine_mime_type_webp() {
    // RIFF....WEBP header: 'RIFF' + ... + 'WEBP' at offset 8
    let mut data = vec![0x52u8, 0x49, 0x46, 0x46];
    data.extend_from_slice(&[0u8, 0u8, 0u8, 0u8]);
    data.extend_from_slice(b"WEBP");
    assert_eq!(determine_mime_type(&data), "image/webp".to_string());
}

#[test]
fn extract_album_art_probed_from_sample_file() {
    let path = "music-files/Polygondwanaland.mp3";
    let probe = get_audio_probe(path);
    let mut pm = probe.metadata;
    let _ = extract_album_art_probed(&mut pm);
}

#[test]
fn apply_tags_does_not_overwrite_existing_values() {
    let path = "music-files/Polygondwanaland.mp3";
    let mut probe = get_audio_probe(path);

    // Get latest revision if any
    if let Some(mut meta) = probe.metadata.get() {
        if let Some(revision) = meta.skip_to_latest() {
            // Start with pre-filled values
            let mut title = Some("Existing Title".to_string());
            let mut artist = Some("Existing Artist".to_string());
            let mut album = Some("Existing Album".to_string());
            let mut year = Some("1999".to_string());

            apply_tags_from_revision(&revision, &mut title, &mut artist, &mut album, &mut year);

            // Values should remain unchanged because apply_tags_from_revision
            // only sets values when the destination is None.
            assert_eq!(title.unwrap(), "Existing Title");
            assert_eq!(artist.unwrap(), "Existing Artist");
            assert_eq!(album.unwrap(), "Existing Album");
            assert_eq!(year.unwrap(), "1999");
        }
    }
}

#[test]
fn apply_tags_handles_none_inputs_without_panicking() {
    let path = "music-files/Polygondwanaland.mp3";
    let mut probe = get_audio_probe(path);

    if let Some(mut meta) = probe.metadata.get() {
        if let Some(revision) = meta.skip_to_latest() {
            let mut title: Option<String> = None;
            let mut artist: Option<String> = None;
            let mut album: Option<String> = None;
            let mut year: Option<String> = None;

            // Should not panic regardless of whether the revision has tags.
            apply_tags_from_revision(&revision, &mut title, &mut artist, &mut album, &mut year);
        }
    }
}

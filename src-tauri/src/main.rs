// Re;Code desktop shell. The app is one web page (dist/index.html); Rust only gives it
// plain file access inside folders the user picks. Nothing is sent anywhere.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{fs, io::Read, path::PathBuf};

fn err<E: std::fmt::Display>(e: E) -> String { e.to_string() }

#[tauri::command]
fn read_text(path: PathBuf) -> Result<String, String> { fs::read_to_string(path).map_err(err) }

#[tauri::command]
fn write_text(path: PathBuf, text: String) -> Result<(), String> {
    if let Some(p) = path.parent() { fs::create_dir_all(p).map_err(err)?; }
    // write to a temp file then rename, so a crash mid-save never leaves a half-written project
    let tmp = path.with_extension("tmp-save");
    fs::write(&tmp, text).map_err(err)?;
    fs::rename(&tmp, &path).map_err(err)
}

#[tauri::command]
fn list_dir(path: PathBuf) -> Result<Vec<(String, bool)>, String> {
    let mut out = vec![];
    for e in fs::read_dir(path).map_err(err)? {
        let e = e.map_err(err)?;
        out.push((e.file_name().to_string_lossy().into(), e.path().is_dir()));
    }
    Ok(out)
}

#[tauri::command]
fn make_dir(path: PathBuf) -> Result<(), String> { fs::create_dir_all(path).map_err(err) }

#[tauri::command]
fn exists(path: PathBuf) -> bool { path.exists() }

/// Plain text of a .docx: paragraphs from word/document.xml, one per line.
#[tauri::command]
fn docx_text(path: PathBuf) -> Result<String, String> {
    let mut z = zip::ZipArchive::new(fs::File::open(path).map_err(err)?).map_err(err)?;
    let mut xml = String::new();
    z.by_name("word/document.xml").map_err(err)?.read_to_string(&mut xml).map_err(err)?;
    Ok(docx_xml_to_text(&xml))
}

fn docx_xml_to_text(xml: &str) -> String {
    // ponytail: tag scan, not a full XML parser; enough for text, tabs and line breaks in transcripts
    let (mut out, mut i) = (String::new(), 0);
    let b = xml.as_bytes();
    while i < b.len() {
        if b[i] == b'<' {
            let end = xml[i..].find('>').map(|j| i + j).unwrap_or(b.len() - 1);
            let tag = &xml[i + 1..end];
            if tag.starts_with("/w:p") { out.push('\n'); }
            else if tag.starts_with("w:tab") { out.push('\t'); }
            else if tag.starts_with("w:br") { out.push('\n'); }
            i = end + 1;
        } else {
            let end = xml[i..].find('<').map(|j| i + j).unwrap_or(b.len());
            out.push_str(&xml[i..end].replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"").replace("&apos;", "'").replace("&amp;", "&"));
            i = end;
        }
    }
    out
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![read_text, write_text, list_dir, make_dir, exists, docx_text])
        .run(tauri::generate_context!())
        .expect("error while running Re;Code");
}

#[cfg(test)]
mod tests {
    #[test]
    fn docx_text() {
        let x = r#"<w:body><w:p><w:r><w:t>Interviewer: Hi &amp; welcome</w:t></w:r></w:p><w:p><w:r><w:t>Sam:</w:t><w:tab/><w:t>Thanks</w:t></w:r></w:p></w:body>"#;
        assert_eq!(super::docx_xml_to_text(x), "Interviewer: Hi & welcome\nSam:\tThanks\n");
    }
}

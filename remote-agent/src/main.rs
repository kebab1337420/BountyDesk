#![allow(non_snake_case)]
#![allow(non_upper_case_globals)]

// La capture d'écran et l'injection d'entrées utilisent l'API Win32 (user32,
// gdi32) déclarée en FFI brut dans le module `win` plus bas. Aucun portage
// Linux/macOS n'existe : on le dit en une ligne plutôt que de laisser
// API Win32 déclarée en FFI brut : ce module n'existe que sur Windows.
#[cfg(not(windows))]
compile_error!(
    "bountydesk-agent ne cible que Windows (capture BitBlt/GetDIBits + SendInput, \
     API Win32 en FFI brut). Il n'existe pas de portage Linux : \
     l'application BountyDesk, elle, fonctionne sur les deux plateformes."
);

use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use serde::Deserialize;
use tokio::sync::mpsc;
use tokio::time::sleep;
use tokio_tungstenite::tungstenite::Message;

#[derive(Deserialize, Clone)]
struct Config {
    server: String,
    port: u16,
    token: String,
    #[serde(default)]
    fps: u32,
    #[serde(default)]
    quality: u32,
}

fn agent_dir() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."))
}

fn log_msg(msg: &str) {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let line = format!("[{now}] {msg}\n");
    let _ = OpenOptions::new()
        .create(true)
        .append(true)
        .open(agent_dir().join("agent.log"))
        .map(|mut f| f.write_all(line.as_bytes()));
    eprintln!("{line}");
}

mod win {
    use std::os::raw::c_int;

    pub const SM_CXSCREEN: c_int = 0;
    pub const SM_CYSCREEN: c_int = 1;
    pub const SRCCOPY: u32 = 0x00CC0020;
    pub const BI_RGB: u32 = 0;
    pub const DIB_RGB_COLORS: u32 = 0;

    pub const MOUSEEVENTF_MOVE: u32 = 0x0001;
    pub const MOUSEEVENTF_LEFTDOWN: u32 = 0x0002;
    pub const MOUSEEVENTF_LEFTUP: u32 = 0x0004;
    pub const MOUSEEVENTF_RIGHTDOWN: u32 = 0x0008;
    pub const MOUSEEVENTF_RIGHTUP: u32 = 0x0010;
    pub const MOUSEEVENTF_MIDDLEDOWN: u32 = 0x0020;
    pub const MOUSEEVENTF_MIDDLEUP: u32 = 0x0040;
    pub const MOUSEEVENTF_WHEEL: u32 = 0x0800;
    pub const MOUSEEVENTF_ABSOLUTE: u32 = 0x8000;

    pub const KEYEVENTF_EXTENDEDKEY: u32 = 0x0001;
    pub const KEYEVENTF_KEYUP: u32 = 0x0002;

    #[repr(C)]
    pub struct BITMAPINFOHEADER {
        pub biSize: u32,
        pub biWidth: i32,
        pub biHeight: i32,
        pub biPlanes: u16,
        pub biBitCount: u16,
        pub biCompression: u32,
        pub biSizeImage: u32,
        pub biXPelsPerMeter: i32,
        pub biYPelsPerMeter: i32,
        pub biClrUsed: u32,
        pub biClrImportant: u32,
    }

    #[repr(C)]
    pub struct BITMAPINFO {
        pub bmiHeader: BITMAPINFOHEADER,
        pub bmiColors: [u32; 3],
    }

    #[repr(C)]
    #[derive(Clone, Copy)]
    pub struct MOUSEINPUT {
        pub dx: i32,
        pub dy: i32,
        pub mouseData: u32,
        pub dwFlags: u32,
        pub time: u32,
        pub dwExtraInfo: usize,
    }

    #[repr(C)]
    #[derive(Clone, Copy)]
    pub struct KEYBDINPUT {
        pub wVk: u16,
        pub wScan: u16,
        pub dwFlags: u32,
        pub time: u32,
        pub dwExtraInfo: usize,
    }

    #[repr(C)]
    #[derive(Clone, Copy)]
    pub struct HARDWAREINPUT {
        pub uMsg: u32,
        pub wParamL: u16,
        pub wParamH: u16,
    }

    #[repr(C)]
    #[derive(Clone, Copy)]
    pub union INPUT_UNION {
        pub mi: MOUSEINPUT,
        pub ki: KEYBDINPUT,
        pub hi: HARDWAREINPUT,
    }

    #[repr(C)]
    #[derive(Clone, Copy)]
    pub struct INPUT {
        pub itype: u32,
        pub u: INPUT_UNION,
    }

    #[link(name = "user32")]
    unsafe extern "system" {
        pub fn GetDC(hwnd: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
        pub fn ReleaseDC(hwnd: *mut std::ffi::c_void, hdc: *mut std::ffi::c_void) -> c_int;
        pub fn GetSystemMetrics(nIndex: c_int) -> c_int;
        pub fn MapVirtualKeyW(uCode: u32, uMapType: u32) -> u32;
        pub fn SendInput(cInputs: u32, pInputs: *mut INPUT, cbSize: u32) -> u32;
    }

    #[link(name = "gdi32")]
    unsafe extern "system" {
        pub fn CreateCompatibleDC(hdc: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
        pub fn CreateCompatibleBitmap(
            hdc: *mut std::ffi::c_void,
            cx: c_int,
            cy: c_int,
        ) -> *mut std::ffi::c_void;
        pub fn SelectObject(
            hdc: *mut std::ffi::c_void,
            gdiobj: *mut std::ffi::c_void,
        ) -> *mut std::ffi::c_void;
        pub fn BitBlt(
            hdcDest: *mut std::ffi::c_void,
            x: c_int,
            y: c_int,
            w: c_int,
            h: c_int,
            hdcSrc: *mut std::ffi::c_void,
            x1: c_int,
            y1: c_int,
            rop: u32,
        ) -> c_int;
        pub fn GetDIBits(
            hdc: *mut std::ffi::c_void,
            bmp: *mut std::ffi::c_void,
            uStartScan: u32,
            cScanLines: u32,
            lpvBits: *mut std::ffi::c_void,
            lpbi: *mut BITMAPINFO,
            uUsage: u32,
        ) -> c_int;
        pub fn DeleteDC(hdc: *mut std::ffi::c_void) -> c_int;
        pub fn DeleteObject(obj: *mut std::ffi::c_void) -> c_int;
    }

    pub fn screen_size() -> (i32, i32) {
        unsafe { (GetSystemMetrics(SM_CXSCREEN), GetSystemMetrics(SM_CYSCREEN)) }
    }
}

fn capture_rgb() -> Option<(Vec<u8>, u32, u32)> {
    use win::*;
    let hdc_screen = unsafe { GetDC(std::ptr::null_mut()) };
    if hdc_screen.is_null() {
        return None;
    }
    let (w, h) = screen_size();
    let hdc_mem = unsafe { CreateCompatibleDC(hdc_screen) };
    let bitmap = unsafe { CreateCompatibleBitmap(hdc_screen, w, h) };
    if hdc_mem.is_null() || bitmap.is_null() {
        unsafe {
            ReleaseDC(std::ptr::null_mut(), hdc_screen);
        }
        return None;
    }
    unsafe {
        SelectObject(hdc_mem, bitmap);
    }
    let ok = unsafe { BitBlt(hdc_mem, 0, 0, w, h, hdc_screen, 0, 0, SRCCOPY) } != 0;
    let mut rgb = None;
    if ok {
        let mut bmi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: w,
                biHeight: -h,
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB,
                biSizeImage: 0,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [0; 3],
        };
        let mut bgra = vec![0u8; (w * h * 4) as usize];
        let got = unsafe {
            GetDIBits(
                hdc_mem,
                bitmap,
                0,
                h as u32,
                bgra.as_mut_ptr().cast(),
                &mut bmi as *mut BITMAPINFO,
                DIB_RGB_COLORS,
            )
        };
        if got != 0 {
            let mut out = Vec::with_capacity((w * h * 3) as usize);
            for px in bgra.chunks_exact(4) {
                out.extend_from_slice(&[px[2], px[1], px[0]]);
            }
            rgb = Some((out, w as u32, h as u32));
        }
    }
    unsafe {
        DeleteObject(bitmap);
        DeleteDC(hdc_mem);
        ReleaseDC(std::ptr::null_mut(), hdc_screen);
    }
    rgb
}

fn encode_jpeg(rgb: &[u8], w: u32, h: u32, quality: u32) -> Vec<u8> {
    let mut out = Vec::new();
    let encoder = jpeg_encoder::Encoder::new(&mut out, quality.clamp(10, 95) as u8);
    let _ = encoder.encode(rgb, w as u16, h as u16, jpeg_encoder::ColorType::Rgb);
    out
}

fn mouse_input(flags: u32, dx: i32, dy: i32, mouse_data: u32) -> win::INPUT {
    win::INPUT {
        itype: 0,
        u: win::INPUT_UNION {
            mi: win::MOUSEINPUT {
                dx,
                dy,
                mouseData: mouse_data,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    }
}

fn key_input(vk: u16, down: bool) -> win::INPUT {
    let mut dw_flags = 0u32;
    if !down {
        dw_flags |= win::KEYEVENTF_KEYUP;
    }
    if is_extended(vk) {
        dw_flags |= win::KEYEVENTF_EXTENDEDKEY;
    }
    let scan = unsafe { win::MapVirtualKeyW(vk as u32, 0) } as u16;
    win::INPUT {
        itype: 1,
        u: win::INPUT_UNION {
            ki: win::KEYBDINPUT {
                wVk: vk,
                wScan: scan,
                dwFlags: dw_flags,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    }
}

fn is_extended(vk: u16) -> bool {
    matches!(
        vk,
        0x21 | 0x22 | 0x23 | 0x24 | 0x25 | 0x26 | 0x27 | 0x28 | 0x2d | 0x2e | 0x90 | 0xa2
            | 0xa3 | 0xa5 | 0x5c
    )
}

fn send_inputs(inputs: &[win::INPUT]) {
    if inputs.is_empty() {
        return;
    }
    let mut stacked = inputs.to_vec();
    unsafe {
        win::SendInput(
            stacked.len() as u32,
            stacked.as_mut_ptr(),
            std::mem::size_of::<win::INPUT>() as u32,
        );
    }
}

fn move_mouse(x: f64, y: f64) {
    let dx = (x.clamp(0.0, 1.0) * 65535.0) as i32;
    let dy = (y.clamp(0.0, 1.0) * 65535.0) as i32;
    send_inputs(&[mouse_input(
        win::MOUSEEVENTF_MOVE | win::MOUSEEVENTF_ABSOLUTE,
        dx,
        dy,
        0,
    )]);
}

fn press_button(button: &str, down: bool) {
    let flags = match (button, down) {
        ("left", true) => win::MOUSEEVENTF_LEFTDOWN,
        ("left", false) => win::MOUSEEVENTF_LEFTUP,
        ("right", true) => win::MOUSEEVENTF_RIGHTDOWN,
        ("right", false) => win::MOUSEEVENTF_RIGHTUP,
        ("middle", true) => win::MOUSEEVENTF_MIDDLEDOWN,
        ("middle", false) => win::MOUSEEVENTF_MIDDLEUP,
        _ => return,
    };
    send_inputs(&[mouse_input(flags, 0, 0, 0)]);
}

fn wheel(delta: i32) {
    let data = (-delta) as u32;
    send_inputs(&[mouse_input(win::MOUSEEVENTF_WHEEL, 0, 0, data)]);
}

fn key_to_vk(code: &str) -> Option<u16> {
    if let Some(rest) = code.strip_prefix("Key") {
        if rest.len() == 1 {
            let c = rest.as_bytes()[0];
            if c.is_ascii_uppercase() {
                return Some(c as u16);
            }
        }
    }
    if let Some(rest) = code.strip_prefix("Digit") {
        if let Ok(n) = rest.parse::<u16>() {
            if n <= 9 {
                return Some(0x30 + n);
            }
        }
    }
    if let Some(rest) = code.strip_prefix("Numpad") {
        if let Ok(n) = rest.parse::<u16>() {
            if n <= 9 {
                return Some(0x60 + n);
            }
        }
    }
    if let Some(rest) = code.strip_prefix("F") {
        if let Ok(n) = rest.parse::<u16>() {
            if (1..=24).contains(&n) {
                return Some(0x6f + n);
            }
        }
    }
    let m = match code {
        "Enter" | "NumpadEnter" => 0x0d,
        "Backspace" => 0x08,
        "Tab" => 0x09,
        "Space" => 0x20,
        "Escape" => 0x1b,
        "Insert" => 0x2d,
        "Delete" => 0x2e,
        "Home" => 0x24,
        "End" => 0x23,
        "PageUp" => 0x21,
        "PageDown" => 0x22,
        "ArrowUp" => 0x26,
        "ArrowDown" => 0x28,
        "ArrowLeft" => 0x25,
        "ArrowRight" => 0x27,
        "CapsLock" => 0x14,
        "NumLock" => 0x90,
        "ScrollLock" => 0x91,
        "Pause" => 0x13,
        "ContextMenu" => 0x5d,
        "ControlLeft" => 0x11,
        "ControlRight" => 0xa3,
        "ShiftLeft" => 0x10,
        "ShiftRight" => 0xa2,
        "AltLeft" => 0x12,
        "AltRight" => 0xa5,
        "MetaLeft" => 0x5b,
        "MetaRight" => 0x5c,
        "Minus" => 0xbd,
        "Equal" => 0xbb,
        "BracketLeft" => 0xdb,
        "BracketRight" => 0xdd,
        "Backslash" => 0xdc,
        "Semicolon" => 0xba,
        "Quote" => 0xde,
        "Backquote" => 0xc0,
        "Comma" => 0xbc,
        "Period" => 0xbe,
        "Slash" => 0xbf,
        "IntlBackslash" => 0xe2,
        _ => return None,
    };
    Some(m)
}

fn press_key(vk: u16, down: bool, ctrl: bool, alt: bool, shift: bool, meta: bool) {
    let mut inputs = Vec::new();
    if down {
        if ctrl {
            inputs.push(key_input(0x11, true));
        }
        if alt {
            inputs.push(key_input(0x12, true));
        }
        if shift {
            inputs.push(key_input(0x10, true));
        }
        if meta {
            inputs.push(key_input(0x5b, true));
        }
        inputs.push(key_input(vk, true));
    } else {
        inputs.push(key_input(vk, false));
        if meta {
            inputs.push(key_input(0x5b, false));
        }
        if shift {
            inputs.push(key_input(0x10, false));
        }
        if alt {
            inputs.push(key_input(0x12, false));
        }
        if ctrl {
            inputs.push(key_input(0x11, false));
        }
    }
    send_inputs(&inputs);
}

fn apply_event(ev: &serde_json::Value) {
    let t = ev.get("type").and_then(|v| v.as_str());
    match t {
        Some("mousemove") => {
            let x = ev.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let y = ev.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0);
            move_mouse(x, y);
        }
        Some("mousedown") | Some("mouseup") => {
            let x = ev.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let y = ev.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let button_name = ev
                .get("button")
                .and_then(|v| v.as_str())
                .unwrap_or("left");
            let down = t == Some("mousedown");
            move_mouse(x, y);
            press_button(button_name, down);
        }
        Some("wheel") => {
            let d = ev.get("deltaY").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            wheel(d);
        }
        Some("keydown") | Some("keyup") => {
            let code = ev.get("code").and_then(|v| v.as_str()).unwrap_or("");
            let ctrl = ev.get("ctrl").and_then(|v| v.as_bool()).unwrap_or(false);
            let alt = ev.get("alt").and_then(|v| v.as_bool()).unwrap_or(false);
            let shift = ev.get("shift").and_then(|v| v.as_bool()).unwrap_or(false);
            let meta = ev.get("meta").and_then(|v| v.as_bool()).unwrap_or(false);
            if let Some(vk) = key_to_vk(code) {
                press_key(vk, t == Some("keydown"), ctrl, alt, shift, meta);
            }
        }
        _ => {}
    }
}

fn apply_input(payload: &serde_json::Value) {
    if let Some(events) = payload.get("events").and_then(|v| v.as_array()) {
        for ev in events {
            apply_event(ev);
        }
    }
}

fn read_config() -> anyhow::Result<Config> {
    let p = agent_dir().join("config.json");
    let text = std::fs::read_to_string(&p)
        .map_err(|e| anyhow::anyhow!("config.json illisible : {e}"))?;
    serde_json::from_str(&text).map_err(|e| anyhow::anyhow!("config.json invalide : {e}"))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cfg = read_config()?;
    let fps = if cfg.fps == 0 { 12 } else { cfg.fps };
    let quality = if cfg.quality == 0 { 75 } else { cfg.quality };

    let streaming = Arc::new(AtomicBool::new(false));
    let conf_fps = Arc::new(AtomicU32::new(fps));
    let conf_quality = Arc::new(AtomicU32::new(quality));
    let (tx, mut rx) = mpsc::channel::<Vec<u8>>(4);

    let s_streaming = streaming.clone();
    let s_fps = conf_fps.clone();
    let s_quality = conf_quality.clone();
    std::thread::spawn(move || {
        let mut frame_interval = Duration::from_millis((1000u64 / u64::from(s_fps.load(Ordering::SeqCst))).max(30));
        loop {
            if !s_streaming.load(Ordering::SeqCst) {
                std::thread::sleep(Duration::from_millis(50));
                continue;
            }
            let start = Instant::now();
            if let Some((rgb, w, h)) = capture_rgb() {
                let q = s_quality.load(Ordering::SeqCst);
                let jpeg = encode_jpeg(&rgb, w, h, q);
                if !jpeg.is_empty() && tx.blocking_send(jpeg).is_err() {
                    break;
                }
            }
            frame_interval = Duration::from_millis((1000u64 / u64::from(s_fps.load(Ordering::SeqCst))).max(30));
            let elapsed = start.elapsed();
            if elapsed < frame_interval {
                std::thread::sleep(frame_interval - elapsed);
            }
        }
    });

    let (sw, sh) = win::screen_size();
    let hostname = std::env::var("COMPUTERNAME").unwrap_or_else(|_| "PC".to_string());

    let mut backoff = Duration::from_secs(1);
    loop {
        let base_url = format!("ws://{}:{}/agent", cfg.server, cfg.port);
        let connected = connect_once(
            &base_url,
            &cfg.token,
            &hostname,
            sw,
            sh,
            &streaming,
            &conf_fps,
            &conf_quality,
            &mut rx,
        )
        .await;
        streaming.store(false, Ordering::SeqCst);
        match &connected {
            Ok(reason) => {
                log_msg(&format!("déconnexion ({reason})"));
                backoff = Duration::from_secs(1);
                sleep(Duration::from_millis(500)).await;
            }
            Err(e) => {
                log_msg(&format!("erreur connexion : {e}"));
                log_msg(&format!("reconnexion dans {}s", backoff.as_secs()));
                sleep(backoff).await;
                backoff = (backoff * 2).min(Duration::from_secs(15));
            }
        }
    }
}

async fn connect_once(
    base_url: &str,
    token: &str,
    hostname: &str,
    sw: i32,
    sh: i32,
    streaming: &AtomicBool,
    conf_fps: &AtomicU32,
    conf_quality: &AtomicU32,
    rx: &mut mpsc::Receiver<Vec<u8>>,
) -> anyhow::Result<&'static str> {
    use futures_util::{SinkExt, StreamExt};
    use tokio_tungstenite::tungstenite::client::IntoClientRequest;

    let mut request = base_url.into_client_request()?;
    let headers = request.headers_mut();
    headers.insert("Authorization", format!("Bearer {token}").parse()?);
    log_msg(&format!("connexion {base_url}"));
    let (mut ws, _) = tokio_tungstenite::connect_async(request).await?;

    let hello = serde_json::json!({ "type": "hello", "hostname": hostname });
    let dims = serde_json::json!({ "type": "dims", "width": sw, "height": sh });
    ws.send(Message::Text(hello.to_string().into())).await?;
    ws.send(Message::Text(dims.to_string().into())).await?;

    loop {
        tokio::select! {
            frame = rx.recv() => {
                match frame {
                    Some(frame) => {
                        ws.send(Message::Binary(frame.into())).await?;
                    }
                    None => return Ok("canal de capture arrêté"),
                }
            }
            incoming = ws.next() => {
                match incoming {
                    Some(Ok(Message::Text(text))) => {
                        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) {
                            match v.get("type").and_then(|t| t.as_str()) {
                                Some("startStream") => {
                                    streaming.store(true, Ordering::SeqCst);
                                    log_msg("startStream");
                                }
                                Some("stopStream") => {
                                    streaming.store(false, Ordering::SeqCst);
                                    log_msg("stopStream");
                                }
                                Some("streamConfig") => {
                                    if let (Some(max), Some(q)) = (v.get("maxFps").and_then(|x| x.as_u64()), v.get("quality").and_then(|x| x.as_u64())) {
                                        let f = max.clamp(1, 30) as u32;
                                        let qq = q.clamp(10, 95) as u32;
                                        conf_fps.store(f, Ordering::SeqCst);
                                        conf_quality.store(qq, Ordering::SeqCst);
                                        log_msg(&format!("streamConfig fps={f} quality={qq}"));
                                    }
                                }
                                Some("input") => apply_input(&v),
                                Some("bye") => return Ok("bye du serveur"),
                                _ => {}
                            }
                        }
                    }
                    Some(Ok(Message::Binary(_))) => {}
                    Some(Ok(Message::Ping(p))) => {
                        ws.send(Message::Pong(p)).await?;
                    }
                    Some(Err(e)) => return Err(e.into()),
                    _ => return Ok("connexion fermée"),
                }
            }
        }
    }
}
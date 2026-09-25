using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace IADonkey.ColorPicker {
    static class Program {
        [StructLayout(LayoutKind.Sequential)]
        struct ICONINFO {
            public bool fIcon;
            public int xHotspot;
            public int yHotspot;
            public IntPtr hbmMask;
            public IntPtr hbmColor;
        }

        [DllImport("user32.dll")]
        static extern IntPtr CreateIconIndirect(ref ICONINFO icon);

        [DllImport("user32.dll")]
        static extern bool GetIconInfo(IntPtr hIcon, out ICONINFO piconinfo);

        [DllImport("user32.dll")]
        static extern bool DestroyIcon(IntPtr hIcon);

        [DllImport("gdi32.dll")]
        static extern bool DeleteObject(IntPtr hObject);

        [DllImport("user32.dll")]
        static extern bool SetSystemCursor(IntPtr hcur, uint id);

        [DllImport("user32.dll")]
        static extern IntPtr CopyIcon(IntPtr hIcon);

        [DllImport("user32.dll", SetLastError = true)]
        static extern bool SystemParametersInfo(uint uiAction, uint uiParam, IntPtr pvParam, uint fWinIni);

        [DllImport("user32.dll")]
        static extern IntPtr GetDC(IntPtr hwnd);

        [DllImport("user32.dll")]
        static extern int ReleaseDC(IntPtr hwnd, IntPtr hdc);

        [DllImport("gdi32.dll")]
        static extern uint GetPixel(IntPtr hdc, int nXPos, int nYPos);

        [DllImport("user32.dll", SetLastError = true)]
        static extern IntPtr SetWindowsHookEx(int idHook, HookProc lpfn, IntPtr hMod, uint dwThreadId);

        [DllImport("user32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        static extern bool UnhookWindowsHookEx(IntPtr hhk);

        [DllImport("user32.dll")]
        static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        static extern IntPtr GetModuleHandle(string lpModuleName);

        [DllImport("user32.dll")]
        static extern bool SetProcessDPIAware();

        [DllImport("user32.dll")]
        static extern bool SetProcessDpiAwarenessContext(IntPtr dpiContext);

        [DllImport("user32.dll")]
        static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

        [DllImport("gdi32.dll", EntryPoint = "CreateRoundRectRgn")]
        static extern IntPtr CreateRoundRectRgn(int nLeftRect, int nTopRect, int nRightRect, int nBottomRect, int nWidthEllipse, int nHeightEllipse);

        [DllImport("user32.dll")]
        static extern int SetWindowRgn(IntPtr hWnd, IntPtr hRgn, bool bRedraw);

        [DllImport("dwmapi.dll")]
        static extern int DwmExtendFrameIntoClientArea(IntPtr hWnd, ref MARGINS pMarInset);

        [DllImport("dwmapi.dll")]
        static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

        [StructLayout(LayoutKind.Sequential)]
        struct MARGINS {
            public int leftWidth;
            public int rightWidth;
            public int topHeight;
            public int bottomHeight;
        }

        const int DWMWA_NCRENDERING_POLICY = 2;
        const int DWMNCRP_ENABLED = 2;
        const int DWMWA_WINDOW_CORNER_PREFERENCE = 33;
        const int DWMWCP_ROUND = 2;
        const int WS_THICKFRAME = 0x00040000;
        const int WS_CAPTION = 0x00C00000;
        const int WM_NCCALCSIZE = 0x0083;

        delegate IntPtr HookProc(int nCode, IntPtr wParam, IntPtr lParam);

        const int WH_MOUSE_LL = 14;
        const int WH_KEYBOARD_LL = 13;
        const int WM_LBUTTONDOWN = 0x0201;
        const int WM_RBUTTONDOWN = 0x0204;
        const int WM_KEYDOWN = 0x0100;
        const int VK_ESCAPE = 0x1B;
        const int VK_RETURN = 0x0D;
        const int VK_SPACE = 0x20;

        const uint SPI_SETCURSORS = 0x0057;

        static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
        const uint SWP_NOACTIVATE = 0x0010;
        const uint SWP_SHOWWINDOW = 0x0040;

        static IntPtr _kbdHook = IntPtr.Zero;
        static HookProc _kbdProc;
        static bool _picked = false;
        static DateTime _startTime;
        static bool _gdiCopyFailed = false;

        static IntPtr CreateEyedropperCursor() {
            try {
                using (Bitmap bmp = new Bitmap(32, 32)) {
                    using (Graphics g = Graphics.FromImage(bmp)) {
                        g.Clear(Color.Transparent);
                        g.SmoothingMode = SmoothingMode.AntiAlias;

                        using (GraphicsPath path = new GraphicsPath()) {
                            // Pipette tip at (1, 30) bottom-left pointing towards target
                            path.AddLine(1, 30, 4, 27);
                            path.AddLine(4, 27, 16, 15);
                            path.AddLine(16, 15, 14, 13);
                            path.AddLine(14, 13, 17, 10);
                            path.AddLine(17, 10, 21, 6);
                            path.AddArc(21, 3, 8, 8, 225, 180);
                            path.AddLine(27, 9, 23, 13);
                            path.AddLine(23, 13, 20, 16);
                            path.AddLine(20, 16, 18, 14);
                            path.AddLine(18, 14, 6, 26);
                            path.AddLine(6, 26, 3, 29);
                            path.CloseFigure();

                            using (var fill = new SolidBrush(Color.White)) {
                                g.FillPath(fill, path);
                            }
                            using (var outline = new Pen(Color.FromArgb(20, 20, 20), 1.5f)) {
                                g.DrawPath(outline, path);
                            }
                        }
                    }
                    IntPtr hIcon = bmp.GetHicon();
                    ICONINFO info;
                    GetIconInfo(hIcon, out info);
                    info.xHotspot = 1;
                    info.yHotspot = 30;
                    info.fIcon = false;
                    IntPtr hCursor = CreateIconIndirect(ref info);
                    DestroyIcon(hIcon);
                    if (info.hbmColor != IntPtr.Zero) DeleteObject(info.hbmColor);
                    if (info.hbmMask != IntPtr.Zero) DeleteObject(info.hbmMask);
                    return hCursor;
                }
            } catch {
                return IntPtr.Zero;
            }
        }

        [STAThread]
        static void Main(string[] args) {
            _startTime = DateTime.UtcNow;

            try {
                SetProcessDpiAwarenessContext((IntPtr)(-4));
            } catch {
                try { SetProcessDPIAware(); } catch { }
            }

            if (args.Length > 0 && (args[0] == "--instant" || args[0] == "-i")) {
                Point pt = Cursor.Position;
                Color c = ReadSinglePixel(pt.X, pt.Y);
                Console.WriteLine("#{0:X2}{1:X2}{2:X2}", c.R, c.G, c.B);
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            _kbdProc = KeyboardHookCallback;

            IntPtr hEyeCursor = CreateEyedropperCursor();

            using (var curProcess = Process.GetCurrentProcess())
            using (var curModule = curProcess.MainModule) {
                IntPtr modHandle = GetModuleHandle(curModule.ModuleName);
                _kbdHook = SetWindowsHookEx(WH_KEYBOARD_LL, _kbdProc, modHandle, 0);
            }

            try {
                using (var overlay = new OverlayForm(hEyeCursor)) {
                    Application.Run(overlay);
                }
            } finally {
                if (_kbdHook != IntPtr.Zero) UnhookWindowsHookEx(_kbdHook);
                if (hEyeCursor != IntPtr.Zero) DestroyIcon(hEyeCursor);
            }

            if (_picked) {
                Point p = Cursor.Position;
                Color c = ReadSinglePixel(p.X, p.Y);
                Console.WriteLine("#{0:X2}{1:X2}{2:X2}", c.R, c.G, c.B);
            }
        }

        public static Color ReadSinglePixel(int x, int y) {
            if (!_gdiCopyFailed) {
                try {
                    using (Bitmap bmp = new Bitmap(1, 1)) {
                        using (Graphics g = Graphics.FromImage(bmp)) {
                            g.CopyFromScreen(x, y, 0, 0, new Size(1, 1), CopyPixelOperation.SourceCopy);
                        }
                        return bmp.GetPixel(0, 0);
                    }
                } catch {
                    _gdiCopyFailed = true;
                }
            }
            try {
                IntPtr dc = GetDC(IntPtr.Zero);
                uint px = GetPixel(dc, x, y);
                ReleaseDC(IntPtr.Zero, dc);
                if (px != 0xFFFFFFFF) {
                    return Color.FromArgb((int)(px & 0xFF), (int)((px >> 8) & 0xFF), (int)((px >> 16) & 0xFF));
                }
            } catch { }
            return Color.Black;
        }

        static IntPtr KeyboardHookCallback(int nCode, IntPtr wParam, IntPtr lParam) {
            if (nCode >= 0 && wParam.ToInt32() == WM_KEYDOWN) {
                int vkCode = Marshal.ReadInt32(lParam);
                if (vkCode == VK_ESCAPE) {
                    Application.Exit();
                    return (IntPtr)1;
                } else if (vkCode == VK_RETURN || vkCode == VK_SPACE) {
                    _picked = true;
                    Application.Exit();
                    return (IntPtr)1;
                }
            }
            return CallNextHookEx(_kbdHook, nCode, wParam, lParam);
        }

        public static GraphicsPath CreateRoundedRectangle(Rectangle rect, int radius) {
            GraphicsPath path = new GraphicsPath();
            int d = radius * 2;
            path.AddArc(rect.X, rect.Y, d, d, 180, 90);
            path.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
            path.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
            path.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
            path.CloseFigure();
            return path;
        }

        class OverlayForm : Form {
            LoupeForm _loupe;

            public OverlayForm(IntPtr hCur) {
                this.FormBorderStyle = FormBorderStyle.None;
                this.StartPosition = FormStartPosition.Manual;
                this.Bounds = SystemInformation.VirtualScreen;
                this.ShowInTaskbar = false;
                this.TopMost = true;
                this.DoubleBuffered = true;
                this.BackColor = Color.Black;
                this.Opacity = 0.005;

                if (hCur != IntPtr.Zero) {
                    try {
                        this.Cursor = new Cursor(CopyIcon(hCur));
                    } catch { }
                }

                _loupe = new LoupeForm(hCur);
                _loupe.Show();
            }

            protected override void OnMouseMove(MouseEventArgs e) {
                base.OnMouseMove(e);
                _loupe.UpdatePosition();
            }

            protected override void OnMouseDown(MouseEventArgs e) {
                base.OnMouseDown(e);
                if (e.Button == MouseButtons.Left) {
                    _picked = true;
                    Application.Exit();
                } else if (e.Button == MouseButtons.Right) {
                    Application.Exit();
                }
            }

            protected override void OnKeyDown(KeyEventArgs e) {
                base.OnKeyDown(e);
                if (e.KeyCode == Keys.Escape) {
                    Application.Exit();
                } else if (e.KeyCode == Keys.Return || e.KeyCode == Keys.Space) {
                    _picked = true;
                    Application.Exit();
                }
            }

            protected override void Dispose(bool disposing) {
                if (disposing && _loupe != null && !_loupe.IsDisposed) {
                    _loupe.Dispose();
                }
                base.Dispose(disposing);
            }
        }

        class LoupeForm : Form {
            const int GRID_COUNT = 9;
            const int CELL_SIZE = 14;
            const int GRID_PIXELS = GRID_COUNT * CELL_SIZE; // 126 px
            const int CORNER_RADIUS = 20;

            Timer _timer;
            Bitmap _gridBitmap;

            protected override CreateParams CreateParams {
                get {
                    CreateParams cp = base.CreateParams;
                    // WS_THICKFRAME and WS_CAPTION tell Windows DWM to attach the full modern diffused window shadow
                    cp.Style |= WS_THICKFRAME | WS_CAPTION;
                    return cp;
                }
            }

            protected override void WndProc(ref Message m) {
                if (m.Msg == WM_NCCALCSIZE && m.WParam != IntPtr.Zero) {
                    // Suppress standard title bar and window frame, allowing custom full client rendering
                    m.Result = IntPtr.Zero;
                    return;
                }
                base.WndProc(ref m);
            }

            public LoupeForm(IntPtr hCur) {
                if (hCur != IntPtr.Zero) {
                    try {
                        this.Cursor = new Cursor(CopyIcon(hCur));
                    } catch { }
                }
                this.FormBorderStyle = FormBorderStyle.None;
                this.StartPosition = FormStartPosition.Manual;
                this.ShowInTaskbar = false;
                this.TopMost = true;
                this.DoubleBuffered = true;

                // Width: 126 grid + 28 padding = 154 px. Height: ~224 px
                this.Size = new Size(GRID_PIXELS + 28, GRID_PIXELS + 98);

                // Material 3 Expressive surface background: #181920
                this.BackColor = Color.FromArgb(24, 25, 32);

                // Enable modern DWM widely diffused drop shadow and smooth rounded corners (Windows 11)
                try {
                    int policy = DWMNCRP_ENABLED;
                    DwmSetWindowAttribute(this.Handle, DWMWA_NCRENDERING_POLICY, ref policy, sizeof(int));
                    int corner = DWMWCP_ROUND;
                    DwmSetWindowAttribute(this.Handle, DWMWA_WINDOW_CORNER_PREFERENCE, ref corner, sizeof(int));
                    MARGINS margins = new MARGINS { leftWidth = 1, rightWidth = 1, topHeight = 1, bottomHeight = 1 };
                    DwmExtendFrameIntoClientArea(this.Handle, ref margins);
                } catch { }

                _gridBitmap = new Bitmap(GRID_COUNT, GRID_COUNT);

                _timer = new Timer();
                _timer.Interval = 20; // 50 fps smooth tracking
                _timer.Tick += (s, e) => UpdatePosition();
                _timer.Start();

                this.Show();
                UpdatePosition();
            }

            public void UpdatePosition() {
                if (this.IsDisposed) return;

                Point cur = Cursor.Position;
                int targetX = cur.X + 24;
                int targetY = cur.Y + 24;

                Screen scr = Screen.FromPoint(cur);
                if (targetX + this.Width > scr.Bounds.Right) {
                    targetX = cur.X - this.Width - 16;
                }
                if (targetY + this.Height > scr.Bounds.Bottom) {
                    targetY = cur.Y - this.Height - 16;
                }
                if (targetX < scr.Bounds.Left) {
                    targetX = scr.Bounds.Left + 8;
                }
                if (targetY < scr.Bounds.Top) {
                    targetY = scr.Bounds.Top + 8;
                }

                SetWindowPos(this.Handle, HWND_TOPMOST, targetX, targetY, this.Width, this.Height, SWP_NOACTIVATE | SWP_SHOWWINDOW);
                this.Invalidate();
            }

            protected override void OnMouseDown(MouseEventArgs e) {
                base.OnMouseDown(e);
                if (e.Button == MouseButtons.Left) {
                    _picked = true;
                    Application.Exit();
                } else if (e.Button == MouseButtons.Right) {
                    Application.Exit();
                }
            }

            protected override void OnPaint(PaintEventArgs e) {
                base.OnPaint(e);
                Graphics g = e.Graphics;
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

                Point cur = Cursor.Position;
                int half = GRID_COUNT / 2;
                int srcX = cur.X - half;
                int srcY = cur.Y - half;

                Color centerColor = Color.Black;

                bool sampledOk = false;
                if (!_gdiCopyFailed) {
                    try {
                        using (Graphics gGrid = Graphics.FromImage(_gridBitmap)) {
                            gGrid.CopyFromScreen(srcX, srcY, 0, 0, new Size(GRID_COUNT, GRID_COUNT), CopyPixelOperation.SourceCopy);
                        }
                        sampledOk = true;
                    } catch {
                        _gdiCopyFailed = true;
                    }
                }

                if (!sampledOk) {
                    centerColor = ReadSinglePixel(cur.X, cur.Y);
                    using (Graphics gGrid = Graphics.FromImage(_gridBitmap)) {
                        gGrid.Clear(centerColor);
                    }
                } else {
                    centerColor = _gridBitmap.GetPixel(half, half);
                }

                int startX = 14;
                int startY = 14;

                // 1. Lens Aperture (Circular Mag Lens)
                Rectangle lensRect = new Rectangle(startX, startY, GRID_PIXELS, GRID_PIXELS);
                using (var lensPath = new GraphicsPath()) {
                    lensPath.AddEllipse(lensRect);
                    g.SetClip(lensPath);

                    using (var lensBg = new SolidBrush(Color.FromArgb(14, 15, 20))) {
                        g.FillEllipse(lensBg, lensRect);
                    }

                    // 2. Render pixel grid
                    g.SmoothingMode = SmoothingMode.None;
                    for (int py = 0; py < GRID_COUNT; py++) {
                        for (int px = 0; px < GRID_COUNT; px++) {
                            Color c = _gridBitmap.GetPixel(px, py);
                            using (var brush = new SolidBrush(c)) {
                                g.FillRectangle(brush, startX + px * CELL_SIZE, startY + py * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                            }
                            using (var pen = new Pen(Color.FromArgb(20, 255, 255, 255), 1)) {
                                g.DrawRectangle(pen, startX + px * CELL_SIZE, startY + py * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                            }
                        }
                    }

                    g.ResetClip();
                }

                g.SmoothingMode = SmoothingMode.AntiAlias;

                // 2. Subtle Lens Bezel Ring
                using (var ringPen = new Pen(Color.FromArgb(50, 255, 255, 255), 1.5f)) {
                    g.DrawEllipse(ringPen, lensRect);
                }

                // 3. Highlight Center Reticle (Reticle / Target Ring with contrast shadow)
                int centerBoxX = startX + half * CELL_SIZE;
                int centerBoxY = startY + half * CELL_SIZE;
                Rectangle centerTargetRect = new Rectangle(centerBoxX - 1, centerBoxY - 1, CELL_SIZE + 2, CELL_SIZE + 2);
                using (var centerPath = CreateRoundedRectangle(centerTargetRect, 3)) {
                    // Outer dark drop-shadow for visibility on any bright background
                    using (var shadowPen = new Pen(Color.FromArgb(160, 0, 0, 0), 2.5f)) {
                        g.DrawPath(shadowPen, centerPath);
                    }
                    // Inner white precision border
                    using (var whitePen = new Pen(Color.White, 1.5f)) {
                        g.DrawPath(whitePen, centerPath);
                    }
                }

                // 4. Color Swatch (Circular Pill with multi-layered diffused soft shadow, borderless) & Value Section
                int swatchY = startY + GRID_PIXELS + 12;
                Rectangle swatchRect = new Rectangle(14, swatchY, 28, 28);
                // Outer diffuse layer
                using (var s3 = new SolidBrush(Color.FromArgb(25, 0, 0, 0))) {
                    g.FillEllipse(s3, new Rectangle(12, swatchY + 3, 32, 31));
                }
                // Mid soft layer
                using (var s2 = new SolidBrush(Color.FromArgb(40, 0, 0, 0))) {
                    g.FillEllipse(s2, new Rectangle(13, swatchY + 2, 30, 30));
                }
                // Near shadow layer
                using (var s1 = new SolidBrush(Color.FromArgb(60, 0, 0, 0))) {
                    g.FillEllipse(s1, new Rectangle(14, swatchY + 1, 28, 28));
                }
                using (var swatchBrush = new SolidBrush(centerColor)) {
                    g.FillEllipse(swatchBrush, swatchRect);
                }

                string hexText = string.Format("#{0:X2}{1:X2}{2:X2}", centerColor.R, centerColor.G, centerColor.B);
                string rgbText = string.Format("RGB: {0}, {1}, {2}", centerColor.R, centerColor.G, centerColor.B);

                using (var hexFont = new Font("Segoe UI", 10.5f, FontStyle.Bold))
                using (var rgbFont = new Font("Segoe UI", 7.5f, FontStyle.Regular))
                using (var textBrush = new SolidBrush(Color.White))
                using (var subBrush = new SolidBrush(Color.FromArgb(156, 163, 175))) {
                    g.DrawString(hexText, hexFont, textBrush, 49, swatchY - 1);
                    g.DrawString(rgbText, rgbFont, subBrush, 50, swatchY + 16);
                }

                // 5. Divider Line (ultra subtle)
                int divY = swatchY + 36;
                using (var divPen = new Pen(Color.FromArgb(18, 255, 255, 255), 1f)) {
                    g.DrawLine(divPen, 14, divY, this.Width - 14, divY);
                }

                // 6. Footer Shortcut Text (Inverted colors: text in white, shortcut keys in rose accent, no button boxes)
                int footerY = divY + 7;
                using (var keyFont = new Font("Segoe UI", 8f, FontStyle.Bold))
                using (var labelFont = new Font("Segoe UI", 7.5f, FontStyle.Regular))
                using (var keyBrush = new SolidBrush(Color.FromArgb(244, 63, 94)))
                using (var labelBrush = new SolidBrush(Color.White)) {
                    // Left: ↵ vybrat
                    g.DrawString("↵", keyFont, keyBrush, 14, footerY - 1);
                    g.DrawString("vybrat", labelFont, labelBrush, 28, footerY);

                    // Right: Esc konec
                    g.DrawString("Esc", keyFont, keyBrush, 86, footerY - 1);
                    g.DrawString("konec", labelFont, labelBrush, 110, footerY);
                }

                // 7. Outer Card: borderless (clean M3 surface with CS_DROPSHADOW system window shadow)
            }

            protected override void Dispose(bool disposing) {
                if (disposing) {
                    if (_timer != null) { _timer.Stop(); _timer.Dispose(); }
                    if (_gridBitmap != null) { _gridBitmap.Dispose(); }
                }
                base.Dispose(disposing);
            }
        }
    }
}

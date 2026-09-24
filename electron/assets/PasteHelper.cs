using System;
using System.IO;
using System.Text;
using System.Runtime.InteropServices;
using System.Threading;

namespace IADonkey {
    static class PasteHelper {
        [StructLayout(LayoutKind.Sequential)]
        struct RECT {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct INPUT {
            public uint type;
            public KEYBDINPUT ki;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct KEYBDINPUT {
            public ushort wVk;
            public ushort wScan;
            public uint dwFlags;
            public uint time;
            public UIntPtr dwExtraInfo;
            public uint pad1;
            public uint pad2;
        }

        [DllImport("user32.dll")]
        static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        static extern bool BringWindowToTop(IntPtr hWnd);

        [DllImport("user32.dll")]
        static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);

        [DllImport("user32.dll")]
        static extern IntPtr GetTopWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        static extern IntPtr GetWindow(IntPtr hWnd, uint uCmd);

        [DllImport("user32.dll")]
        static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll")]
        static extern bool IsIconic(IntPtr hWnd);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

        [DllImport("user32.dll")]
        static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll")]
        static extern int GetWindowLong(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll")]
        static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

        [DllImport("user32.dll")]
        static extern uint MapVirtualKey(uint uCode, uint uMapType);

        [DllImport("user32.dll")]
        static extern short GetAsyncKeyState(int vKey);

        [DllImport("user32.dll", SetLastError = true)]
        static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

        [DllImport("user32.dll")]
        static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

        const uint GW_HWNDNEXT = 2;
        const int GWL_EXSTYLE = -20;
        const int WS_EX_TOOLWINDOW = 0x00000080;
        const int SW_RESTORE = 9;

        const uint INPUT_KEYBOARD = 1;
        const uint KEYEVENTF_KEYUP = 0x0002;

        const int VK_RETURN = 0x0D;
        const int VK_SHIFT = 0x10;
        const int VK_CONTROL = 0x11;
        const int VK_MENU = 0x12;
        const int VK_V = 0x56;

        static string LogFile;

        static void Log(string msg) {
            try {
                if (!string.IsNullOrEmpty(LogFile)) {
                    File.AppendAllText(LogFile, string.Format("[{0:HH:mm:ss.fff}] {1}\r\n", DateTime.Now, msg));
                }
            } catch {}
        }

        static bool IsTargetAppWindow(IntPtr hWnd, uint iadonkeyPid, IntPtr iadonkeyHwnd) {
            if (hWnd == IntPtr.Zero || hWnd == iadonkeyHwnd) return false;
            if (!IsWindowVisible(hWnd)) return false;

            uint pid = 0;
            GetWindowThreadProcessId(hWnd, out pid);
            if (iadonkeyPid != 0 && pid == iadonkeyPid) return false;

            StringBuilder sbClass = new StringBuilder(256);
            GetClassName(hWnd, sbClass, 256);
            string cls = sbClass.ToString();
            if (cls == "Progman" || cls == "WorkerW" || cls == "Shell_TrayWnd" ||
                cls == "Shell_SecondaryTrayWnd" || cls == "Windows.UI.Core.CoreWindow" ||
                cls == "DV2ControlHost" || cls == "EdgeUiInputTopWndClass") {
                return false;
            }

            StringBuilder sbTitle = new StringBuilder(256);
            GetWindowText(hWnd, sbTitle, 256);
            if (sbTitle.Length == 0) return false;

            int exStyle = GetWindowLong(hWnd, GWL_EXSTYLE);
            if ((exStyle & WS_EX_TOOLWINDOW) != 0) return false;

            RECT rc;
            if (GetWindowRect(hWnd, out rc)) {
                if ((rc.Right - rc.Left) < 50 || (rc.Bottom - rc.Top) < 50) return false;
            }

            return true;
        }

        static IntPtr FindTargetWindow(uint iadonkeyPid, IntPtr iadonkeyHwnd) {
            IntPtr fg = GetForegroundWindow();
            if (IsTargetAppWindow(fg, iadonkeyPid, iadonkeyHwnd)) {
                Log("Foreground window is already target app: 0x" + fg.ToString("X"));
                return fg;
            }

            IntPtr cur = GetTopWindow(IntPtr.Zero);
            while (cur != IntPtr.Zero) {
                if (IsTargetAppWindow(cur, iadonkeyPid, iadonkeyHwnd)) {
                    StringBuilder sb = new StringBuilder(256);
                    GetWindowText(cur, sb, 256);
                    StringBuilder sbc = new StringBuilder(256);
                    GetClassName(cur, sbc, 256);
                    Log(string.Format("Found target in Z-order: 0x{0:X} ({1}) [{2}]", cur.ToInt64(), sbc, sb));
                    return cur;
                }
                cur = GetWindow(cur, GW_HWNDNEXT);
            }

            Log("No target app window found in Z-order");
            return IntPtr.Zero;
        }

        static void ActivateWindow(IntPtr hWnd) {
            if (hWnd == IntPtr.Zero) return;

            if (IsIconic(hWnd)) {
                ShowWindow(hWnd, SW_RESTORE);
            }

            BringWindowToTop(hWnd);
            bool ok = SetForegroundWindow(hWnd);
            Log("SetForegroundWindow result: " + ok);
        }

        static void SendCtrlV() {
            ushort scanCtrl = (ushort)MapVirtualKey((uint)VK_CONTROL, 0);
            ushort scanV = (ushort)MapVirtualKey((uint)VK_V, 0);

            INPUT[] inputs = new INPUT[4];

            // 1. Ctrl Down
            inputs[0].type = INPUT_KEYBOARD;
            inputs[0].ki.wVk = (ushort)VK_CONTROL;
            inputs[0].ki.wScan = scanCtrl;
            inputs[0].ki.dwFlags = 0;

            // 2. V Down
            inputs[1].type = INPUT_KEYBOARD;
            inputs[1].ki.wVk = (ushort)VK_V;
            inputs[1].ki.wScan = scanV;
            inputs[1].ki.dwFlags = 0;

            // 3. V Up
            inputs[2].type = INPUT_KEYBOARD;
            inputs[2].ki.wVk = (ushort)VK_V;
            inputs[2].ki.wScan = scanV;
            inputs[2].ki.dwFlags = KEYEVENTF_KEYUP;

            // 4. Ctrl Up
            inputs[3].type = INPUT_KEYBOARD;
            inputs[3].ki.wVk = (ushort)VK_CONTROL;
            inputs[3].ki.wScan = scanCtrl;
            inputs[3].ki.dwFlags = KEYEVENTF_KEYUP;

            uint sent = SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));
            Log("SendInput sent: " + sent);

            if (sent < inputs.Length) {
                int err = Marshal.GetLastWin32Error();
                Log("SendInput failed with error " + err + ", falling back to keybd_event");

                keybd_event((byte)VK_CONTROL, (byte)scanCtrl, 0, UIntPtr.Zero);
                Thread.Sleep(20);
                keybd_event((byte)VK_V, (byte)scanV, 0, UIntPtr.Zero);
                Thread.Sleep(30);
                keybd_event((byte)VK_V, (byte)scanV, KEYEVENTF_KEYUP, UIntPtr.Zero);
                Thread.Sleep(20);
                keybd_event((byte)VK_CONTROL, (byte)scanCtrl, KEYEVENTF_KEYUP, UIntPtr.Zero);
                Log("keybd_event fallback executed");
            }
        }

        [STAThread]
        static void Main(string[] args) {
            try {
                string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                string dir = Path.Combine(appData, "iadonkey");
                if (Directory.Exists(dir)) {
                    LogFile = Path.Combine(dir, "paste-helper.log");
                }
            } catch {}

            int delayMs = 60;
            uint iadonkeyPid = 0;
            IntPtr iadonkeyHwnd = IntPtr.Zero;

            if (args != null && args.Length > 0) {
                int parsedDelay;
                if (int.TryParse(args[0], out parsedDelay)) {
                    delayMs = parsedDelay;
                }
            }
            if (args != null && args.Length > 1) {
                uint parsedPid;
                if (uint.TryParse(args[1], out parsedPid)) {
                    iadonkeyPid = parsedPid;
                }
            }
            if (args != null && args.Length > 2) {
                long parsedHwnd;
                if (long.TryParse(args[2], out parsedHwnd)) {
                    iadonkeyHwnd = new IntPtr(parsedHwnd);
                }
            }

            Log(string.Format("--- Started: delay={0}ms, iadonkeyPid={1}, iadonkeyHwnd=0x{2:X} ---", delayMs, iadonkeyPid, iadonkeyHwnd.ToInt64()));

            if (delayMs > 0) {
                Thread.Sleep(delayMs);
            }

            // Find target window
            IntPtr target = FindTargetWindow(iadonkeyPid, iadonkeyHwnd);
            if (target != IntPtr.Zero) {
                ActivateWindow(target);

                // Wait up to 150ms for target to become foreground
                for (int i = 0; i < 15; i++) {
                    IntPtr curFg = GetForegroundWindow();
                    if (curFg == target) {
                        Log("Target became foreground window at check " + i);
                        break;
                    }
                    Thread.Sleep(10);
                }
            }

            // Wait up to 150ms for physical keys to release
            for (int i = 0; i < 15; i++) {
                bool enterHeld = (GetAsyncKeyState(VK_RETURN) & 0x8000) != 0;
                bool shiftHeld = (GetAsyncKeyState(VK_SHIFT) & 0x8000) != 0;
                bool altHeld = (GetAsyncKeyState(VK_MENU) & 0x8000) != 0;
                if (!enterHeld && !shiftHeld && !altHeld) {
                    Log("Physical keys released at check " + i);
                    break;
                }
                Thread.Sleep(10);
            }

            Thread.Sleep(20);

            // Execute Ctrl+V
            SendCtrlV();
            Log("Done.");
        }
    }
}

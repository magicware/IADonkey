; ========================================================
; IADonkey 1-Click Silent Installer Configuration
; ========================================================

; Force the installer to be completely silent (never show any Win32 progress dialog or white box)
SilentInstall silent

!ifndef BUILD_UNINSTALLER
  !macro customInstall
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" ""
  !macroend
!endif

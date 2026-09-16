; ========================================================
; IADonkey Installer Modern Dark Theme Configuration
; ========================================================

; Colors matching IADonkey SettingsModal (#1E1E28 / #6366F1 / #F3F4F6)
!define MUI_BGCOLOR "1E1E28"
!define MUI_TEXTCOLOR "F3F4F6"

; Directory page styling
!define MUI_DIRECTORYPAGE_BGCOLOR "1E1E28"
!define MUI_DIRECTORYPAGE_TEXTCOLOR "F3F4F6"

; Instfiles (progress) colors: Indigo progress bar on dark background
!define MUI_INSTFILESPAGE_PROGRESSBAR "colored"
!define MUI_INSTFILESPAGE_COLORS "6366F1 1E1E28"

; Finish page links
!define MUI_FINISHPAGE_LINK_COLOR "818CF8"

!ifndef BUILD_UNINSTALLER
  ; Welcome Page enabled with our custom sidebar
  !macro customWelcomePage
    !insertmacro MUI_PAGE_WELCOME
  !macroend

  ; Hook into GUI initialization for installer
  !define MUI_CUSTOMFUNCTION_GUIINIT donkeyInstallerGUIInit

  Function donkeyInstallerGUIInit
    ; Set parent window background and text color (#1E1E28 background)
    SetCtlColors $HWNDPARENT 0xF3F4F6 0x1E1E28

    ; Style bottom branding text (control ID 1028)
    GetDlgItem $0 $HWNDPARENT 1028
    SetCtlColors $0 0x818CF8 0x1E1E28

    ; Remove the harsh horizontal divider lines for a clean flat modern layout
    GetDlgItem $0 $HWNDPARENT 1035
    ShowWindow $0 0
    GetDlgItem $0 $HWNDPARENT 1038
    ShowWindow $0 0
    GetDlgItem $0 $HWNDPARENT 1045
    ShowWindow $0 0
  FunctionEnd

!else
  ; Hook into GUI initialization for uninstaller
  !define MUI_CUSTOMFUNCTION_UNGUIINIT un.donkeyInstallerGUIInit

  Function un.donkeyInstallerGUIInit
    SetCtlColors $HWNDPARENT 0xF3F4F6 0x1E1E28
    GetDlgItem $0 $HWNDPARENT 1028
    SetCtlColors $0 0x818CF8 0x1E1E28
    GetDlgItem $0 $HWNDPARENT 1035
    ShowWindow $0 0
    GetDlgItem $0 $HWNDPARENT 1038
    ShowWindow $0 0
    GetDlgItem $0 $HWNDPARENT 1045
    ShowWindow $0 0
  FunctionEnd

!endif

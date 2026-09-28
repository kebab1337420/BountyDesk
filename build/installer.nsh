!macro customInstall
  ; Ouvre le port MCP (8787) dans le pare-feu Windows pour cet exécutable.
  ; Idempotent : on supprime puis on recrée la règle.
  nsExec::Exec 'netsh advfirewall firewall delete rule name="BountyDesk MCP"'
  nsExec::Exec 'netsh advfirewall firewall add rule name="BountyDesk MCP" dir=in action=allow program="$INSTDIR\BountyDesk.exe" enable=yes profile=any'
!macroend

!macro customUnInstall
  nsExec::Exec 'netsh advfirewall firewall delete rule name="BountyDesk MCP"'
!macroend
!macro customInstall
  ; L'ancienne regle BountyDesk MCP (avant renommage) pointe un binaire
  ; desinstalle : on la supprime pour ne pas laisser de regle orpheline.
  nsExec::Exec 'netsh advfirewall firewall delete rule name="BountyDesk MCP"'
  ; Ouvre le port MCP (8787) dans le pare-feu Windows pour cet exécutable.
  ; Idempotent : on supprime puis on recrée la règle.
  nsExec::Exec 'netsh advfirewall firewall delete rule name="Venari MCP"'
  nsExec::Exec 'netsh advfirewall firewall add rule name="Venari MCP" dir=in action=allow program="$INSTDIR\Venari.exe" enable=yes profile=any'
!macroend

!macro customUnInstall
  nsExec::Exec 'netsh advfirewall firewall delete rule name="Venari MCP"'
!macroend
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

projectDir = "c:\Users\Santosh Parab\Desktop\miniproject"
WshShell.CurrentDirectory = projectDir

' Locate python
pythonExe = "python"
userPython = "C:\Users\Santosh Parab\AppData\Local\Microsoft\WindowsApps\python.exe"
If fso.FileExists(userPython) Then
    pythonExe = """" & userPython & """"
End If

' Check if port 8000 is listening
returnCode = WshShell.Run("cmd /c netstat -ano | findstr :8000 >nul", 0, True)

If returnCode <> 0 Then
    ' Start server silently in background
    WshShell.Run "cmd /c cd /d """ & projectDir & """ && " & pythonExe & " run.py", 0, False
    ' Wait for server to be responsive
    For i = 1 To 10
        WScript.Sleep 500
        testCode = WshShell.Run("cmd /c netstat -ano | findstr :8000 >nul", 0, True)
        If testCode = 0 Then Exit For
    Next
End If

chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

If fso.FileExists(chromePath) Then
    browserPath = chromePath
ElseIf fso.FileExists(edgePath) Then
    browserPath = edgePath
Else
    browserPath = "msedge.exe"
End If

WshShell.Run """" & browserPath & """ --app=http://127.0.0.1:8000/login", 1, False

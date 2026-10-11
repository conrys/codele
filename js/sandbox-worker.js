let pyodide;

self.onmessage=async event=>{
  const message=event.data||{};
  if(message.type==="init"){
    try{
      importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");
      pyodide=await loadPyodide({
        indexURL:"https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
      });
      ["fetch","XMLHttpRequest","WebSocket","EventSource","importScripts",
        "WebTransport","RTCPeerConnection","webkitRTCPeerConnection",
        "Worker","SharedWorker","BroadcastChannel","indexedDB","caches","openDatabase"]
        .forEach(name=>{
          try{self[name]=undefined}catch(error){}
        });
      pyodide.runPython(
        "import sys\n" +
        "sys.modules['js'] = None\n" +
        "sys.modules['pyodide_js'] = None\n" +
        "sys.modules['pyodide'] = None"
      );
      self.postMessage({type:"ready"});
    }catch(error){
      self.postMessage({type:"fail",error:String(error)});
    }
    return;
  }

  if(message.type!=="run"||!pyodide)return;
  try{
    pyodide.globals.set("__sandbox_src",String(message.src||""));
    pyodide.globals.set("__sandbox_stdin",String(message.stdin||""));
    const result=pyodide.runPython(`
import contextlib as __contextlib
import io as __io
import json as __json
import sys as __sys
import traceback as __traceback

class __SandboxOutput:
    def __init__(self, limit):
        self.limit = limit
        self.parts = []
        self.length = 0
        self.truncated = False
    def write(self, value):
        remaining = self.limit - self.length
        if remaining > 0:
            kept = value[:remaining]
            self.parts.append(kept)
            self.length += len(kept)
        if len(value) > max(remaining, 0):
            self.truncated = True
        return len(value)
    def flush(self):
        pass
    def getvalue(self):
        return "".join(self.parts)

__sandbox_stdout = __SandboxOutput(20000)
__sandbox_stderr = __SandboxOutput(20000)
__sandbox_old_stdin = __sys.stdin
__sandbox_namespace = {"__name__": "__main__"}
__sandbox_error = ""
try:
    __sys.stdin = __io.StringIO(__sandbox_stdin)
    with __contextlib.redirect_stdout(__sandbox_stdout), __contextlib.redirect_stderr(__sandbox_stderr):
        try:
            exec(compile(__sandbox_src, "<sandbox>", "exec"), __sandbox_namespace, __sandbox_namespace)
        except BaseException:
            __traceback.print_exc()
finally:
    __sys.stdin = __sandbox_old_stdin
__sandbox_result = {
    "output": __sandbox_stdout.getvalue(),
    "error": __sandbox_stderr.getvalue(),
    "truncated": __sandbox_stdout.truncated or __sandbox_stderr.truncated
}
__json.dumps(__sandbox_result)
`);
    const output=JSON.parse(result);
    self.postMessage({type:"result",result:output});
  }catch(error){
    self.postMessage({type:"fail",error:String(error)});
  }
};

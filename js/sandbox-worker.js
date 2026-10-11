let pyodide;
let sandboxRun;

self.onmessage=async event=>{
  const message=event.data||{};
  if(message.type==="init"){
    try{
      importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");
      pyodide=await loadPyodide({
        indexURL:"https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
      });
      const harnessResponse=await fetch("../py/harness.py?v=20261012c");
      if(!harnessResponse.ok)throw new Error("Не вдалося завантажити підтримку turtle (HTTP "+harnessResponse.status+").");
      pyodide.globals.set("__sandbox_harness",await harnessResponse.text());
      pyodide.runPython("exec(__sandbox_harness)");
      sandboxRun=pyodide.globals.get("sandbox_run");
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
    const result=sandboxRun(String(message.src||""),String(message.stdin||""));
    self.postMessage({type:"result",result:JSON.parse(result)});
  }catch(error){
    self.postMessage({type:"fail",error:String(error)});
  }
};

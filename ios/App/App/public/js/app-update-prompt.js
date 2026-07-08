/* Semitic Jew App: service worker update prompt */
(function(){
  if(!("serviceWorker" in navigator)) return;

  let waitingWorker = null;

  function createPrompt(){
    if(document.getElementById("sj-update-prompt")) return;

    const prompt = document.createElement("div");
    prompt.id = "sj-update-prompt";
    prompt.className = "sj-update-prompt";
    prompt.setAttribute("role", "status");
    prompt.innerHTML = `
      <div>
        <strong>Update available</strong>
        <span>A newer version of the Semitic Jew app is ready.</span>
      </div>
      <button type="button">Refresh</button>
    `;

    prompt.querySelector("button").addEventListener("click", function(){
      if(waitingWorker){
        waitingWorker.postMessage({type:"SKIP_WAITING"});
      }else{
        window.location.reload();
      }
    });

    document.body.appendChild(prompt);
  }

  navigator.serviceWorker.ready.then(function(registration){
    if(registration.waiting){
      waitingWorker = registration.waiting;
      createPrompt();
    }

    registration.addEventListener("updatefound", function(){
      const newWorker = registration.installing;
      if(!newWorker) return;

      newWorker.addEventListener("statechange", function(){
        if(newWorker.state === "installed" && navigator.serviceWorker.controller){
          waitingWorker = newWorker;
          createPrompt();
        }
      });
    });
  });

  navigator.serviceWorker.addEventListener("controllerchange", function(){
    window.location.reload();
  });
})();

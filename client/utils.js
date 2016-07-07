window.UUID = function UUID(){
  return Math.floor(Math.random()*1000000) + '_' + Date.now();
}

window.makeEventable = function(module){
  module.on = function(event, fn){
    if (!this['on' + event])
      this['on' + event] = [];
    else if (!Array.isArray(this['on' + event]))
      this['on' + event] = [this['on' + event]];
    this['on' + event].push(fn);
  }.bind(module);
  module.emit = function(event){
    var args = Array.prototype.slice.call(arguments, 0);
    args.shift();
    var fn = this['on' + event];
    if (fn != null){
      if (!Array.isArray(fn)){
        fn.apply(null, args);
      }
      else {
        var fns = fn;
        fns.map(function(fn){ fn.apply(null, args); });
      }
    }
    else {
      console.log(module.name, 'dropped', event);
    }
  }.bind(module);
  module.once = function(event, fn){
    module.on(event, function(){
      fn.apply(null, arguments);
      module.off(event);
    });
  }
  module.ison = function(event){
    return module['on' + event] != null;
  }.bind(module);
  //TODO removes all fns on events
  module.off = function(event){
    delete module['on' + event];
  }.bind(module);
  return module;
}

window.setDefault = function(obj, prop, val){
  if (!(prop in obj)){
    obj[prop] = val;
    return true;
  }
  return false;
}

window.size = function(obj){
  var c = 0
  for (var prop in obj)
    c += 1;
  return c
}

window.hasValue = function(obj, val){
  for (var prop in obj)
    if (obj[prop] === val)
      return true;
  return false;
}

window._printSuperLog = false;
window._printAnon = false;
window._superLogCounter = -1;
window.enableSuperLogger = function(){
  var oldCall = Function.prototype.call;
  var newCall = function(self) {
    Function.prototype.call = oldCall;

    if (window._printSuperLog && window._superLogCounter != 0){
      if (this.name !== 'slice'){
        var isAnon = this.name == null || this.name == '';
        if (!isAnon || window._printAnon){
          var stack = new Error().stack;
          if (isAnon)
            console.log(Date.now()/1000 + 'Anonymous Function called');
          else
            console.log(Date.now()/1000 + 'Function called:', this.name);
          stack = stack.split('\n').map(function(line){ 
            return '\t' + line; 
          }).join('\n');
          console.log(stack);
          window._superLogCounter -= 1;
        }
      }
    }

    var args = Array.prototype.slice.call(arguments, 1);
    Function.prototype.call = newCall;
    return this.apply(self, args);
  }
  Function.prototype.call = newCall;
}

window.Network = {
    req: function (url, data, done) {
        var request = new XMLHttpRequest();
        var async = true;
        request.open('post', url, async);
        var handled = false;
        request.onload = function () {
          if (handled)
            return;
          if(done !== undefined) {
              var res = request.responseText;
              done(null, res);
          }
        };
        request.onerror = function () {
          handled = true;
          done('error');
        };
        request.onloadend = function(){   
          if (request.status === 404 || request.status == 401){
            handled = true;
            done(request.status);
          }
        }
        request.withCredentials = true;
        if(data !== undefined) {
            var body = new FormData();
            for(var key in data) {
                body.append(key, '' + data[key]);
            }
            request.send(body);
        } else {
            request.send();
        }
    },
    reqLogin: function(url, username, pw, done){
      var XHR = new XMLHttpRequest();
      var urlEncodedData = "";
      var urlEncodedDataPairs = [];

      urlEncodedDataPairs.push(encodeURIComponent('username') + '=' + encodeURIComponent(username));
      urlEncodedDataPairs.push(encodeURIComponent('password') + '=' + encodeURIComponent(pw));
      urlEncodedData = urlEncodedDataPairs.join('&').replace(/%20/g, '+');

      XHR.onload = function () {
          if(done !== undefined) {
              var res = XHR.responseText;
              done(null, res);
          }
      };
      XHR.onerror = function () {
        done('error');
      };
      XHR.onloadend = function(){   
        if (XHR.status === 404 || request.status == 401){
          done(xhr.status);
        }
      }
      XHR.open('POST', url);

      XHR.withCredentials = true;
      XHR.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

      XHR.send(urlEncodedData);
    },
    reqFileSync: function(url){
      var request = new XMLHttpRequest();
      var async = false;
      request.open('get', url, async);
      request.send(null);
      return request.responseText;
    },
};

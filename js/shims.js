(function(w){
  // Normalize isArticlePage to a boolean (false by default) but keep compatibility
  if (typeof w.isArticlePage === 'undefined') w.isArticlePage = false;
  // Helper that always returns a boolean regardless of boolean/function usage elsewhere
  w.__isArticlePage = function(){
    return (typeof w.isArticlePage === 'function') ? !!w.isArticlePage() : !!w.isArticlePage;
  };
})(window);

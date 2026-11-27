/* Theme before first paint: dark by default, the owner's stored choice wins. */
;(function () {
  try {
    var t = localStorage.getItem('ebt.theme')
    var light = t === 'light'
    document.documentElement.dataset.theme = light ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', !light)
  } catch (e) {
    document.documentElement.dataset.theme = 'dark'
  }
})()

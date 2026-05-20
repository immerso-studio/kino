// Copyright (c) 2022 8th Wall, Inc.
//
// app.js is the main entry point for your 8th Wall app. Code here will execute after head.html
// is loaded, and before body.html is loaded.

import './index.css'

// Register custom A-Frame components in app.js before the scene in body.html has loaded.
import {tapPlaceComponent} from './tap-place'
AFRAME.registerComponent('tap-place', tapPlaceComponent)

// Translate 8th Wall device motion prompt to Italian
const observer = new MutationObserver(() => {
  const promptBox = document.querySelector('.prompt-box-8w')
  if (promptBox) {
    const textElement = promptBox.querySelector('p')
    if (textElement && textElement.textContent !== "La realtà aumentata richiede l'accesso ai sensori di movimento del dispositivo.") {
      textElement.textContent = "La realtà aumentata richiede l'accesso ai sensori di movimento del dispositivo."
    }

    const buttons = promptBox.querySelectorAll('.prompt-button-8w')
    buttons.forEach((btn) => {
      if (btn.classList.contains('button-primary-8w')) {
        if (btn.textContent !== 'accetta') {
          btn.textContent = 'accetta'
        }
      } else {
        if (btn.textContent !== 'cancella') {
          btn.textContent = 'cancella'
        }
      }
    })
  }
})
observer.observe(document.body, {childList: true, subtree: true})

// Manage splash screen state and "inizia" click when 8th Wall loading completes
const onLoadingFinished = () => {
  const spinner = document.getElementById('splashSpinner')
  const startButton = document.getElementById('startArButton')
  if (spinner) {
    spinner.style.display = 'none'
  }
  if (startButton) {
    startButton.classList.add('visible')
  }
}

// Watch for loading completion (when #loadingContainer is hidden or removed)
const loadingObserver = new MutationObserver(() => {
  const loadingContainer = document.getElementById('loadingContainer')
  if (!loadingContainer || 
      loadingContainer.classList.contains('hidden') || 
      window.getComputedStyle(loadingContainer).display === 'none') {
    onLoadingFinished()
    loadingObserver.disconnect()
  }
})
loadingObserver.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['class', 'style']
})

// Handle "inizia" button click to fade out the splash screen
const initSplashHandler = () => {
  const startButton = document.getElementById('startArButton')
  const customSplash = document.getElementById('customSplash')
  if (startButton && customSplash) {
    startButton.addEventListener('click', () => {
      customSplash.classList.add('fade-out')
    })
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSplashHandler)
} else {
  initSplashHandler()
}


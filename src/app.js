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

// Listen for scene loading completion to display "Inizia" button
window.addEventListener('DOMContentLoaded', () => {
  const scene = document.querySelector('a-scene')
  const startBtn = document.getElementById('start-ar-btn')
  const overlay = document.getElementById('custom-loading-overlay')

  if (!scene || !startBtn || !overlay) return

  let sceneLoaded = false
  let realityReady = false

  function checkReady() {
    if (sceneLoaded && realityReady) {
      startBtn.classList.add('visible')
    }
  }

  // Check if A-Frame scene is loaded
  if (scene.hasLoaded) {
    sceneLoaded = true
    checkReady()
  } else {
    scene.addEventListener('loaded', () => {
      sceneLoaded = true
      checkReady()
    })
  }

  // Check if 8th Wall reality engine is ready
  window.addEventListener('xr:realityready', () => {
    realityReady = true
    checkReady()
  })

  // Start button action
  startBtn.addEventListener('click', () => {
    overlay.style.opacity = '0'
    setTimeout(() => {
      overlay.style.display = 'none'
    }, 500)
  })
})

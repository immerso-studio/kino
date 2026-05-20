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

// Manage Start Screen visibility after realityready
document.addEventListener('DOMContentLoaded', () => {
  const scene = document.querySelector('a-scene')
  const startScreen = document.getElementById('startScreen')
  const startBtn = document.getElementById('startBtn')
  const promptText = document.getElementById('promptText')

  if (scene) {
    scene.addEventListener('realityready', () => {
      if (startScreen) {
        startScreen.style.display = 'flex'
      }
    })
  }

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (startScreen) {
        startScreen.style.opacity = '0'
        setTimeout(() => {
          startScreen.style.display = 'none'
          if (promptText) {
            promptText.style.display = 'block'
          }
        }, 500)
      }
    })
  }
})

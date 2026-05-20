// Copyright (c) 2022 8th Wall, Inc.
//
// app.js is the main entry point for your 8th Wall app. Code here will execute after head.html
// is loaded, and before body.html is loaded.

import './index.css'

// Register custom A-Frame components in app.js before the scene in body.html has loaded.
import {tapPlaceComponent} from './tap-place'
AFRAME.registerComponent('tap-place', tapPlaceComponent)

// --- Translation system for XRExtras popups ---
const translateXRExtrasToItalian = () => {
  const translations = [
    { id: 'cameraPermissionsErrorAppleMessage', text: 'Ricarica la pagina e abilita l\'accesso alla fotocamera' },
    { id: 'microphonePermissionsErrorAppleMessage', text: 'Ricarica la pagina e abilita l\'accesso a fotocamera e microfono' },
    { selector: '#cameraPermissionsErrorApple .bottom-message', html: 'Assicurati che l\'accesso alla fotocamera sia consentito nelle impostazioni dell\'app <span class="wk-app-name"></span>' },
    { selector: '#microphonePermissionsErrorApple .bottom-message', html: 'Assicurati che l\'accesso a fotocamera e microfono sia consentito nelle impostazioni dell\'app <span class="wk-app-name"></span>' },
    { selector: '#cameraPermissionsErrorAndroid .loading-error-header', text: 'Abilitiamo la fotocamera' },
    { selector: '#microphonePermissionsErrorAndroid .loading-error-header', text: 'Abilitiamo il microfono' },
    { selector: '#cameraPermissionsErrorAndroid .loading-error-footer', html: '<img class="foreground-image" style="transform: rotate(130deg);" src="//cdn.8thwall.com/web/img/loading/v2/reload.svg" /> Quindi, ricarica la pagina per l\'AR!' },
    { selector: '#microphonePermissionsErrorAndroid .loading-error-footer', html: '<img class="foreground-image" style="transform: rotate(130deg);" src="//cdn.8thwall.com/web/img/loading/v2/reload.svg" /> Quindi, ricarica la pagina per l\'AR!' },
    { selector: '#deviceMotionErrorApple .loading-error-header', text: 'Abilitiamo i sensori di movimento' },
    { selector: '#userPromptError h1', text: 'Permessi negati.' },
    { selector: '#userPromptError p', text: 'Devi accettare i permessi di movimento per continuare.' },
    { selector: '#userPromptError #reloadButton', text: 'Ricarica' },
    { selector: '#motionPermissionsErrorApple h1', text: 'Permessi negati.' },
    { selector: '#motionPermissionsErrorApple p:first-of-type', text: 'Hai impedito alla pagina di accedere ai sensori di movimento.' },
    { selector: '#motionPermissionsErrorApple p:last-of-type', html: 'Chiudi l\'app <span class="wk-app-name"></span> per riabilitare i sensori di movimento.' },
    { selector: '#cameraSelectionWorldTrackingError .error-text-header', text: 'Oops, qualcosa è andato storto!' },
    { selector: '#open_browser_android', text: 'Avvia AR' },
    { selector: '#error_text_header_unknown h2', html: 'Apri nel browser<br /> per visualizzare l\'AR' },
    { selector: '#copy_link_android', text: 'Copia link' }
  ];

  const apply = (item) => {
    let el = null;
    if (item.id) {
      el = document.getElementById(item.id);
    } else if (item.selector) {
      el = document.querySelector(item.selector);
    }
    if (el) {
      if (item.text !== undefined && el.textContent !== item.text) {
        el.textContent = item.text;
      }
      if (item.html !== undefined && el.innerHTML !== item.html) {
        el.innerHTML = item.html;
      }
    }
  };

  const camPerm = document.getElementById('requestingCameraPermissions');
  if (camPerm) {
    for (const node of camPerm.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.includes("Tap 'Allow'")) {
        node.textContent = node.textContent.replace("Tap 'Allow' to access AR", "Tocca 'Consenti' per accedere all'AR");
      }
    }
  }

  const translateAndroidList = (instructionsSelector) => {
    const list = document.querySelector(instructionsSelector);
    if (!list) return;
    const lis = list.querySelectorAll('li');
    if (lis.length >= 2) {
      for (const node of lis[0].childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('Tap the')) {
          node.textContent = 'Tocca ';
        }
        if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('in the top right')) {
          node.textContent = ' in alto a destra';
        }
      }
      if (lis[1]) {
        for (const node of lis[1].childNodes) {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('Tap Settings')) {
            node.textContent = 'Tocca Impostazioni';
          }
        }
      }
      lis.forEach((li) => {
        const highlight = li.querySelector('.highlight');
        if (highlight) {
          if (highlight.textContent.trim() === 'Site settings') highlight.textContent = 'Impostazioni sito';
          else if (highlight.textContent.trim() === 'Camera') highlight.textContent = 'Fotocamera';
          else if (highlight.textContent.trim() === 'Microphone') highlight.textContent = 'Microfono';
          else if (highlight.textContent.trim() === 'Blocked') highlight.textContent = 'Bloccato';
          else if (highlight.textContent.trim() === 'Do the same for Camera') highlight.textContent = 'Fai lo stesso per la fotocamera';
          else if (highlight.textContent.trim() === 'Advanced') highlight.textContent = 'Avanzate';
          else if (highlight.textContent.trim() === 'Manage website data') highlight.textContent = 'Gestisci dati sito web';
          else if (highlight.textContent.trim() === 'DELETE') highlight.textContent = 'ELIMINA';
        }
        const btn = li.querySelector('.camera-instruction-button, .microphone-instruction-button');
        if (btn && btn.textContent.trim() === 'CLEAR & RESET') {
          btn.textContent = 'CANCELLA E RIPRISTINA';
        }
        for (const node of li.childNodes) {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('Press and hold')) {
            node.textContent = 'Tieni premuto';
          }
        }
      });
    }
  };

  translateAndroidList('#cameraPermissionsErrorAndroid .loading-error-instructions');
  translateAndroidList('#microphonePermissionsErrorAndroid .loading-error-instructions');

  const motionList = document.querySelector('#deviceMotionErrorApple .loading-error-instructions');
  if (motionList) {
    const lis = motionList.querySelectorAll('li');
    if (lis.length >= 4) {
      for (const node of lis[0].childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('Open')) {
          node.textContent = 'Apri ';
        }
      }
      const b0 = lis[0].querySelector('b');
      if (b0 && b0.textContent === 'Settings') b0.textContent = 'Impostazioni';

      for (const node of lis[1].childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('Select')) {
          node.textContent = 'Seleziona ';
        }
      }
      const b1 = lis[1].querySelector('b');
      if (b1 && b1.textContent === 'Safari') b1.textContent = 'Safari';

      for (const node of lis[2].childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('Enable')) {
          node.textContent = 'Abilita ';
        }
      }
      const h2 = lis[2].querySelector('.highlight');
      if (h2 && h2.textContent.includes('Motion')) {
        h2.textContent = 'Accesso a movimento e orientamento';
      }

      for (const node of lis[3].childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('Reload the page')) {
          node.textContent = 'Ricarica la pagina ';
        }
      }
    }
  }

  translations.forEach(apply);
};

// Start observing mutations on the document body to translate XRExtras elements as they load
const observer = new MutationObserver(() => {
  translateXRExtrasToItalian();
});
observer.observe(document.body, { childList: true, subtree: true });
// Trigger once immediately in case some elements are already present
translateXRExtrasToItalian();

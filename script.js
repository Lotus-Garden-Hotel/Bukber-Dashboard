const API_URL = 'https://script.google.com/macros/s/AKfycbyyv5l0bA8N9eV4sumIVFomNrzZmulROakcHNQlTVEsHi135CQWOGrJyFNtRYMWuRB4HA/exec';

function fetchData() {
    showLoading();
    
    // Coba fetch biasa dulu
    fetchWithFetch()
        .catch(() => {
            console.log('Fetch gagal, mencoba JSONP...');
            fetchWithJSONP();
        });
}

async function fetchWithFetch() {
    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            updateUI(result.data);
        } else {
            throw new Error(result.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        throw error; // Lempar error untuk trigger JSONP
    }
}

function fetchWithJSONP() {
    const callbackName = 'jsonp_callback_' + Date.now();
    
    window[callbackName] = function(data) {
        if (data.success) {
            updateUI(data.data);
        } else {
            showError('Gagal mengambil data: ' + (data.error || 'Unknown error'));
        }
        // Cleanup
        delete window[callbackName];
        document.body.removeChild(script);
    };
    
    const script = document.createElement('script');
    script.src = API_URL + '?callback=' + callbackName;
    
    script.onerror = function() {
        showError('Gagal terhubung ke server. Periksa koneksi Anda.');
        delete window[callbackName];
        document.body.removeChild(script);
    };
    
    document.body.appendChild(script);
}
// ============================================
// KONFIGURASI - GANTI DENGAN URL APPS SCRIPT ANDA
// ============================================
const API_URL = 'https://script.google.com/macros/s/AKfycbxqgmKU4knjw3cGe5S7-sxYt4I0161xM0yh2U8G8unQ/dev';

// ============================================
// FUNGSI UTAMA - AMBIL DATA LIVE
// ============================================
async function fetchData() {
    showLoading();
    
    try {
        // Coba fetch biasa dulu
        await fetchWithFetch();
    } catch (error) {
        console.log('Fetch gagal, beralih ke JSONP:', error);
        // Fallback ke JSONP
        fetchWithJSONP();
    }
}

// Method 1: Menggunakan Fetch API (lebih modern)
async function fetchWithFetch() {
    const response = await fetch(API_URL, {
        method: 'GET',
        mode: 'cors',
        headers: {
            'Accept': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
        updateUI(result.data);
    } else {
        throw new Error(result.error || 'Gagal mengambil data');
    }
}

// Method 2: Menggunakan JSONP (untuk hindari CORS)
function fetchWithJSONP() {
    const callbackName = 'callback_' + Date.now();
    
    // Buat fungsi callback global
    window[callbackName] = function(data) {
        if (data.success) {
            updateUI(data.data);
        } else {
            showError('Error: ' + (data.error || 'Unknown error'));
        }
        
        // Bersihkan setelah selesai
        delete window[callbackName];
        document.body.removeChild(script);
    };
    
    // Buat script tag untuk JSONP
    const script = document.createElement('script');
    script.src = API_URL + '?callback=' + callbackName;
    
    script.onerror = function() {
        showError('Gagal terhubung ke server. Periksa koneksi Anda.');
        delete window[callbackName];
        document.body.removeChild(script);
    };
    
    document.body.appendChild(script);
}

// ============================================
// FUNGSI UPDATE UI
// ============================================
function updateUI(data) {
    console.log('Data received:', data); // Untuk debugging
    
    // Update last update time
    document.getElementById('lastUpdate').textContent = data.lastUpdate || 'Just now';
    
    // Update summary cards
    document.getElementById('totalPax').textContent = 
        formatNumber(data.summary.total2026.pax);
    document.getElementById('totalNett').textContent = 
        formatRupiah(data.summary.total2026.nett);
    document.getElementById('targetPax').textContent = 
        formatNumber(data.summary.target.pax);
    
    const variance = data.variance;
    const varianceEl = document.getElementById('variance');
    varianceEl.textContent = formatNumber(variance);
    varianceEl.className = variance < 0 ? 'value negative' : 'value positive';
    
    // Update table header
    const headerRow = document.getElementById('tableHeader');
    headerRow.innerHTML = '';
    data.headers.forEach(header => {
        if (header) { // Hanya jika header tidak kosong
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        }
    });
    
    // Update table body
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    data.reservations.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        data.headers.forEach(header => {
            if (header) {
                const td = document.createElement('td');
                let value = row[header];
                
                // Format berdasarkan tipe kolom
                if (header.includes('NETT') || header.includes('nett')) {
                    td.textContent = formatRupiah(value);
                } else if (header.includes('DATE') || header.includes('date')) {
                    td.textContent = value || '-';
                } else {
                    td.textContent = value !== undefined && value !== null ? value : '0';
                }
                
                // Highlight baris total
                if (index === 29) { // Baris terakhir (total)
                    td.style.fontWeight = 'bold';
                    td.style.backgroundColor = '#f0f0f0';
                }
                
                tr.appendChild(td);
            }
        });
        
        tbody.appendChild(tr);
    });
    
    // Sembunyikan pesan error jika ada
    hideError();
}

// ============================================
// FUNGSI FORMAT ANGKA
// ============================================
function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return new Intl.NumberFormat('id-ID').format(num);
}

function formatRupiah(num) {
    if (num === undefined || num === null) return 'Rp0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(num);
}

// ============================================
// FUNGSI UTILITY
// ============================================
function showLoading() {
    document.getElementById('tableBody').innerHTML = 
        '<tr><td colspan="8" class="loading">⏳ Memuat data live dari spreadsheet...</td></tr>';
}

function showError(message) {
    document.getElementById('tableBody').innerHTML = 
        `<tr><td colspan="8" class="error">❌ ${message}</td></tr>`;
}

function hideError() {
    // Tidak perlu implementasi khusus
}

// ============================================
// INISIALISASI
// ============================================
document.addEventListener('DOMContentLoaded', fetchData);

// Auto refresh setiap 30 detik (sesuaikan kebutuhan)
setInterval(fetchData, 30000); // 30 detik untuk real-time

// Refresh manual dengan tombol F5
console.log('🚀 Dashboard Bukber 2026 - Live dari Spreadsheet');

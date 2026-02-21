// ============================================
// KONFIGURASI GOOGLE SHEETS API
// ============================================
const SPREADSHEET_ID = '1WXOjbSZCOpVT9zpEvGfbegkxxaT0nhY6ry3mTUwe0pg';
const API_KEY = 'AIzaSyBZjSmOA81ftVsIJT5etEL19NjPdYTVSQk';
const RANGE = 'Sheet1!A2:J38'; // Ambil semua data dari A2 sampai J38

const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;

// ============================================
// FUNGSI AMBIL DATA DARI GOOGLE SHEETS API
// ============================================
async function fetchData() {
    showLoading();
    
    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Data from Sheets API:', data); // Untuk debugging
        
        if (data.values && data.values.length > 0) {
            processSheetData(data.values);
        } else {
            throw new Error('Tidak ada data ditemukan');
        }
        
    } catch (error) {
        console.error('Fetch error:', error);
        showError('Gagal memuat data: ' + error.message);
    }
}

// ============================================
// PROSES DATA DARI SHEETS API (ARRAY 2D)
// ============================================
function processSheetData(rows) {
    // rows adalah array 2D: [ [header1, header2, ...], [baris1], [baris2], ... ]
    
    // Header ada di baris pertama (indeks 0)
    const headers = rows[0] || [];
    
    // Data reservasi: baris 1 sampai 30 (indeks 1-30) sesuai data Anda
    const reservations = [];
    for (let i = 1; i <= 30; i++) {
        if (rows[i]) {
            const row = rows[i];
            const reservation = {};
            headers.forEach((header, index) => {
                if (header) {
                    reservation[header] = row[index] !== undefined ? row[index] : 0;
                }
            });
            reservations.push(reservation);
        }
    }
    
    // Baris total: indeks 30 (baris ke-31)
    const totalRow = rows[30] || [];
    // Baris target: indeks 31 (baris ke-32)
    const targetRow = rows[31] || [];
    // Baris variance: indeks 32 (baris ke-33)
    const varianceRow = rows[32] || [];
    
    const summary = {
        total2026: {
            pax: totalRow[7] || 0,   // GLOBAL PAX (kolom H)
            nett: totalRow[8] || 0    // GLOBAL NETT (kolom I)
        },
        target: {
            pax: targetRow[6] || 3600, // TARGET PAX (kolom G)
            nett: targetRow[7] || 282644628.10 // TARGET NETT (kolom H)
        }
    };
    
    const variance = varianceRow[7] || 0; // VARIANCE (kolom H)
    
    const lastUpdate = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    
    updateUI({
        headers: headers,
        reservations: reservations,
        summary: summary,
        variance: variance,
        lastUpdate: lastUpdate
    });
}

// ============================================
// FUNGSI UPDATE UI (SAMA SEPERTI SEBELUMNYA)
// ============================================
function updateUI(data) {
    document.getElementById('lastUpdate').textContent = data.lastUpdate;
    
    document.getElementById('totalPax').textContent = formatNumber(data.summary.total2026.pax);
    document.getElementById('totalNett').textContent = formatRupiah(data.summary.total2026.nett);
    document.getElementById('targetPax').textContent = formatNumber(data.summary.target.pax);
    
    const variance = data.variance;
    const varianceEl = document.getElementById('variance');
    varianceEl.textContent = formatNumber(variance);
    varianceEl.className = variance < 0 ? 'value negative' : 'value positive';
    
    // Header tabel
    const headerRow = document.getElementById('tableHeader');
    headerRow.innerHTML = '';
    data.headers.forEach(header => {
        if (header) {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        }
    });
    
    // Body tabel
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    data.reservations.forEach(row => {
        const tr = document.createElement('tr');
        data.headers.forEach(header => {
            if (header) {
                const td = document.createElement('td');
                let value = row[header];
                // Format khusus untuk kolom NETT
                if (header.includes('NETT') || header.includes('nett')) {
                    td.textContent = formatRupiah(value);
                } else {
                    td.textContent = value ?? '0';
                }
                tr.appendChild(td);
            }
        });
        tbody.appendChild(tr);
    });
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
        '<tr><td colspan="8" class="loading">⏳ Memuat data dari Google Sheets...</td></tr>';
}

function showError(message) {
    document.getElementById('tableBody').innerHTML = 
        `<tr><td colspan="8" class="error">❌ ${message}</td></tr>`;
}

// ============================================
// INISIALISASI
// ============================================
document.addEventListener('DOMContentLoaded', fetchData);

// Refresh setiap 30 detik (sesuaikan kebutuhan)
setInterval(fetchData, 30000);


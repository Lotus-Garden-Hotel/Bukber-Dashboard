// ============================================
// KONFIGURASI GOOGLE SHEETS API
// ============================================
const SPREADSHEET_ID = '1WXOjbSZCOpVT9zpEvGfbegkxxaT0nhY6ry3mTUwe0pg';
const API_KEY = 'AIzaSyBZjSmOA81ftVsIJT5etEL19NjPdYTVSQk';
const RANGE = 'SUMMARY!A2:J38'; // Ambil semua data dari A2 sampai J38

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
// Ganti bagian processSheetData dengan logika yang lebih dinamis
function processSheetData(rows) {
    const headers = rows[0] || [];
    
    // Gunakan filter/find untuk mencari baris khusus, jangan tebak indeksnya
    const totalRow = rows.find(row => row[0] === 'TOTAL') || [];
    const targetRow = rows.find(row => row[0] === 'TARGET') || [];
    const varianceRow = rows.find(row => row[0] === 'VARIANCE') || [];

    // Ambil data reservasi (asumsi data adalah baris yang kolom pertamanya berisi tanggal/angka)
    const reservations = rows.slice(1).filter(row => {
        // Abaikan baris header, total, target, dan variance
        return row[0] && !['TOTAL', 'TARGET', 'VARIANCE'].includes(row[0]);
    }).map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i] || 0);
        return obj;
    });

    // Helper untuk membersihkan string ke angka
    const cleanNum = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        // Hapus karakter non-angka kecuali titik/koma desimal
        return parseFloat(val.toString().replace(/[^0-9,-]/g, '').replace(',', '.')) || 0;
    };

    const summary = {
        total2026: {
            pax: cleanNum(totalRow[7]), 
            nett: cleanNum(totalRow[8])
        },
        target: {
            pax: cleanNum(targetRow[6]) || 3600,
            nett: cleanNum(targetRow[7]) || 282644628
        }
    };

    updateUI({
        headers,
        reservations,
        summary,
        variance: cleanNum(varianceRow[7]),
        lastUpdate: new Date().toLocaleString('id-ID')
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




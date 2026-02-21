// ============================================
// KONFIGURASI GOOGLE SHEETS API
// ============================================
const SPREADSHEET_ID = '1WXOjbSZCOpVT9zpEvGfbegkxxaT0nhY6ry3mTUwe0pg';
const API_KEY = 'AIzaSyBZjSmOA81ftVsIJT5etEL19NjPdYTVSQk';
const RANGE = 'SUMMARY!A2:I33'; // Header + 30 daily + total + target

const API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;

// ============================================
// FUNGSI KONVERSI ANGKA INDONESIA
// ============================================
function parseIndonesianNumber(str) {
    if (str === undefined || str === null || str === '') return 0;
    if (typeof str === 'number') return str;
    // Hapus "Rp" dan spasi, lalu ganti titik (ribuan) dengan kosong, dan koma dengan titik
    let cleaned = str.toString().replace(/Rp\s*/i, '').replace(/\./g, '').replace(/,/g, '.').trim();
    let num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

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
        console.log('Data from Sheets API:', data);
        
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
// PROSES DATA DARI SHEETS API
// ============================================
function processSheetData(rows) {
    // rows[0] = header
    const headers = rows[0] || [];
    
    // Data reservasi: baris 1 sampai 30 (indeks 1-30)
    const reservations = [];
    for (let i = 1; i <= 30; i++) {
        if (rows[i]) {
            const row = rows[i];
            const reservation = {};
            headers.forEach((header, index) => {
                if (header) {
                    let value = row[index];
                    // Parse angka untuk kolom yang berisi angka (PAX atau NETT)
                    if (header.includes('PAX') || header.includes('NETT')) {
                        reservation[header] = parseIndonesianNumber(value);
                    } else {
                        reservation[header] = value !== undefined ? value : '';
                    }
                }
            });
            reservations.push(reservation);
        }
    }
    
    // Baris total: indeks 31 (baris ke-32)
    const totalRow = rows[31] || [];
    // Baris target: indeks 32 (baris ke-33)
    const targetRow = rows[32] || [];
    
    // Parsing total
    const totalGlobalPax = parseIndonesianNumber(totalRow[7]);  // GLOBAL PAX di kolom H (indeks 7)
    const totalGlobalNett = parseIndonesianNumber(totalRow[8]); // GLOBAL NETT di kolom I (indeks 8)
    
    // Parsing target: berdasarkan screenshot, target pax di kolom D (indeks 3) dan target nett di kolom E (indeks 4)
    const targetPax = parseIndonesianNumber(targetRow[3]) || 3600;
    const targetNett = parseIndonesianNumber(targetRow[4]) || 282644628.10;
    
    // Hitung variance (selisih global pax dengan target pax)
    const variance = totalGlobalPax - targetPax;
    
    const summary = {
        total2026: {
            pax: totalGlobalPax,
            nett: totalGlobalNett
        },
        target: {
            pax: targetPax,
            nett: targetNett
        }
    };
    
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
// FUNGSI UPDATE UI
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
                // Tampilkan sesuai tipe
                if (header.includes('NETT')) {
                    td.textContent = formatRupiah(value);
                } else if (header.includes('PAX') || header === 'NO') {
                    td.textContent = formatNumber(value);
                } else {
                    td.textContent = value ?? '';
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

// Refresh setiap 30 detik
setInterval(fetchData, 30000);

// ============================================
// KONFIGURASI GOOGLE SHEETS API
// ============================================
const SPREADSHEET_ID = '1WXOjbSZCOpVT9zpEvGfbegkxxaT0nhY6ry3mTUwe0pg';
const API_KEY = 'AIzaSyBZjSmOA81ftVsIJT5etEL19NjPdYTVSQk';
const RANGE = 'SUMMARY!A1:J50'; // Ambil range cukup luas (sampai baris 50)

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
// PROSES DATA DARI SHEETS API (DENGAN DETEKSI LABEL)
// ============================================
function processSheetData(rows) {
    // rows[0] = header
    const headers = rows[0] || [];
    
    // 1. Ambil data harian (hingga baris sebelum ada label "TOTAL" di kolom A)
    const dailyRows = [];
    let totalRow = null;
    let targetRow = null;
    let varianceRow = null;
    
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        const firstCell = (row[0] || '').toString().toLowerCase().trim();
        
        if (firstCell.includes('total')) {
            totalRow = row;
        } else if (firstCell.includes('target')) {
            targetRow = row;
        } else if (firstCell.includes('variance') || firstCell.includes('%')) {
            varianceRow = row;
        } else {
            // Jika bukan baris total/target/variance, anggap sebagai data harian
            // Tapi batasi hingga 30 baris pertama agar aman
            if (dailyRows.length < 30) {
                dailyRows.push(row);
            }
        }
    }
    
    // Jika tidak menemukan baris total/target, gunakan indeks tetap (31 dan 32)
    if (!totalRow && rows[30]) totalRow = rows[30];
    if (!targetRow && rows[31]) targetRow = rows[31];
    
    // Proses data harian
    const reservations = dailyRows.map(row => {
        const reservation = {};
        headers.forEach((header, index) => {
            if (header) {
                let value = row[index];
                if (header.includes('PAX') || header.includes('NETT')) {
                    reservation[header] = parseIndonesianNumber(value);
                } else {
                    reservation[header] = value !== undefined ? value : '';
                }
            }
        });
        return reservation;
    });
    
    // Proses total
    let totalGlobalPax = 0, totalGlobalNett = 0;
    if (totalRow) {
        totalGlobalPax = parseIndonesianNumber(totalRow[7]);  // GLOBAL PAX di kolom H
        totalGlobalNett = parseIndonesianNumber(totalRow[8]); // GLOBAL NETT di kolom I
    }
    
    // Proses target (berdasarkan gambar: target pax di kolom D, target nett di kolom E)
    let targetPax = 3600, targetNett = 282644628.10;
    if (targetRow) {
        targetPax = parseIndonesianNumber(targetRow[3]) || targetPax;
        targetNett = parseIndonesianNumber(targetRow[4]) || targetNett;
    }
    
    // Hitung variance
    const variance = totalGlobalPax - targetPax;
    
    // Coba ambil variance dari baris variance jika ada (misal kolom H)
    let variancePercent = variance; // default selisih angka
    if (varianceRow) {
        // Mungkin di kolom H ada teks seperti "-95,56%"
        const varCell = varianceRow[7] || '';
        if (typeof varCell === 'string' && varCell.includes('%')) {
            // Tampilkan persentase di card variance
            variancePercent = varCell;
        } else {
            variancePercent = parseIndonesianNumber(varCell) || variance;
        }
    }
    
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
        variance: variancePercent,
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
    // Jika variance berupa string persen, tampilkan langsung
    if (typeof variance === 'string' && variance.includes('%')) {
        varianceEl.textContent = variance;
    } else {
        varianceEl.textContent = formatNumber(variance);
    }
    varianceEl.className = (typeof variance === 'number' && variance < 0) ? 'value negative' : 'value positive';
    
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

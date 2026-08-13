<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>{{ $pdfTitle ?? 'Jadwal Dinas - BMKG Oesman Sadik' }}</title>
    <style>
        @page {
            margin: 15px 20px;
        }
        body {
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 8px;
            color: #1a1a1a;
            margin: 0;
            padding: 0;
        }
        .header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
        }
        .header h1 {
            font-size: 11px;
            margin: 0;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .header h2 {
            font-size: 10px;
            margin: 2px 0;
            font-weight: bold;
            text-transform: uppercase;
        }
        .header h3 {
            font-size: 9px;
            margin: 2px 0 0 0;
            font-weight: normal;
        }
        .meta-info {
            margin-bottom: 8px;
            font-weight: bold;
            font-size: 8px;
        }
        table.matrix {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        table.matrix th, table.matrix td {
            border: 1px solid #333;
            text-align: center;
            padding: 2px 1px;
            font-size: 7px;
        }
        table.matrix th {
            background-color: #e5e7eb;
            font-weight: bold;
        }
        table.matrix th.day-header {
            font-size: 5.5px;
            font-weight: normal;
            background-color: #f3f4f6;
            padding: 1px 0;
        }
        table.matrix th.is-red {
            background-color: #fca5a5 !important;
            color: #7f1d1d !important;
        }
        table.matrix th.is-holiday {
            background-color: #dc2626 !important;
            color: #ffffff !important;
        }
        table.matrix td.nama {
            text-align: left;
            padding-left: 4px;
            font-weight: bold;
            white-space: nowrap;
            width: 120px;
        }
        .legend-title {
            font-weight: bold;
            font-size: 8px;
            margin-bottom: 3px;
        }
        .legend-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        .legend-grid td {
            font-size: 7px;
            padding: 2px 4px;
            border: 1px solid #d1d5db;
        }
        .signatures {
            width: 100%;
            margin-top: 15px;
        }
        .signatures td {
            width: 50%;
            text-align: center;
            vertical-align: top;
            font-size: 8px;
        }
        .sig-space {
            height: 45px;
        }
        .name {
            font-weight: bold;
            text-decoration: underline;
        }
    </style>
</head>
<body>

    <div class="header">
        <h1>BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA</h1>
        <h2>{{ strtoupper($jadwalBulanan->stasiun) }}</h2>
        <h3>{{ $pdfTitle ?? 'JADWAL DINAS OPERASIONAL OBSERVER METEOROLOGI' }}</h3>
    </div>

    @php
        $namaBulan = [
            1 => 'JANUARI', 2 => 'FEBRUARI', 3 => 'MARET', 4 => 'APRIL',
            5 => 'MEI', 6 => 'JUNI', 7 => 'JULI', 8 => 'AGUSTUS',
            9 => 'SEPTEMBER', 10 => 'OKTOBER', 11 => 'NOVEMBER', 12 => 'DESEMBER'
        ];
        $namaHariIndo = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    @endphp

    <div class="meta-info">
        BULAN: {{ $namaBulan[$bulan] ?? $bulan }} {{ $tahun }} | ZONA WAKTU: {{ $jadwalBulanan->zona_waktu }}
    </div>

    <table class="matrix">
        <thead>
            <tr>
                <th style="width: 20px;" rowspan="2">NO</th>
                <th style="width: 130px;" rowspan="2">NAMA PEGAWAI</th>
                @for ($d = 1; $d <= $daysInMonth; $d++)
                    @php
                        $dateStr = sprintf('%04d-%02d-%02d', $tahun, $bulan, $d);
                        $dayOfWeek = date('w', strtotime($dateStr));
                        $hariName = $namaHariIndo[$dayOfWeek] ?? '';
                        $isWeekend = ($dayOfWeek == 0 || $dayOfWeek == 6);
                        $isHoliday = !empty($holidays[$dateStr]);
                        $class = $isHoliday ? 'is-holiday' : ($isWeekend ? 'is-red' : '');
                    @endphp
                    <th class="day-header {{ $class }}" style="width: 18px;">{{ $hariName }}</th>
                @endfor
            </tr>
            <tr>
                @for ($d = 1; $d <= $daysInMonth; $d++)
                    @php
                        $dateStr = sprintf('%04d-%02d-%02d', $tahun, $bulan, $d);
                        $dayOfWeek = date('w', strtotime($dateStr));
                        $isWeekend = ($dayOfWeek == 0 || $dayOfWeek == 6);
                        $isHoliday = !empty($holidays[$dateStr]);
                        $class = $isHoliday ? 'is-holiday' : ($isWeekend ? 'is-red' : '');
                    @endphp
                    <th class="{{ $class }}" style="width: 18px; font-weight: bold;">{{ $d }}</th>
                @endfor
            </tr>
        </thead>
        <tbody>
            @foreach ($pegawais as $index => $pegawai)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td class="nama">{{ $pegawai->nama }}</td>
                    @for ($d = 1; $d <= $daysInMonth; $d++)
                        @php
                            $kode = $matrix[$pegawai->id][$d] ?? '-';
                        @endphp
                        <td>{{ $kode }}</td>
                    @endfor
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="legend-title">KETERANGAN SHIFT & JAM KERJA ({{ $jadwalBulanan->zona_waktu }}):</div>
    <table class="legend-grid">
        <tr>
            @foreach ($shifts->take(6) as $s)
                <td><strong>{{ $s->kode_shift }}</strong>: {{ $s->nama_shift }} {{ $s->jam_masuk ? '('.substr($s->jam_masuk,0,5).' - '.substr($s->jam_keluar,0,5).')' : '' }}</td>
            @endforeach
        </tr>
        <tr>
            @foreach ($shifts->skip(6) as $s)
                <td><strong>{{ $s->kode_shift }}</strong>: {{ $s->nama_shift }}</td>
            @endforeach
        </tr>
    </table>

    <table class="signatures">
        <tr>
            <td>
                Mengetahui,<br>
                Kepala Kelompok Teknisi / Pokjung<br>
                <div class="sig-space"></div>
                <span class="name">{{ $jadwalBulanan->kepala_pokjung_nama }}</span>
            </td>
            <td>
                Labuha, {{ $daysInMonth }} {{ ucfirst(strtolower($namaBulan[$bulan] ?? '')) }} {{ $tahun }}<br>
                Kepala Stasiun Meteorologi Oesman Sadik<br>
                <div class="sig-space"></div>
                <span class="name">{{ $jadwalBulanan->kepala_stasiun_nama }}</span>
            </td>
        </tr>
    </table>

</body>
</html>

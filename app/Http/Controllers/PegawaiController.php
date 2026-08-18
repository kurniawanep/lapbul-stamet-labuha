<?php

namespace App\Http\Controllers;

use App\Models\Pegawai;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PegawaiController extends Controller
{
    /**
     * Display a listing of employees.
     */
    public function index(Request $request): Response
    {
        $search = $request->input('search');
        $jenis = $request->input('jenis');

        $pegawais = Pegawai::when($search, function ($query, $search) {
            $query->where('nama', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('nip', 'like', "%{$search}%")
                ->orWhere('jabatan', 'like', "%{$search}%")
                ->orWhere('role', 'like', "%{$search}%")
                ->orWhere('pangkat', 'like', "%{$search}%")
                ->orWhere('golongan', 'like', "%{$search}%");
        })
        ->when($jenis, function ($query, $jenis) {
            $query->where('jenis_pegawai', $jenis);
        })
        ->orderBy('jenis_pegawai')
        ->orderBy('id')
        ->get();

        return Inertia::render('Pegawai/Index', [
            'pegawais' => $pegawais,
            'filters' => [
                'search' => $search,
                'jenis' => $jenis,
            ],
            'rolesPns' => [
                'Kepala Stasiun',
                'Tata Usaha',
                'Observer & Forecaster',
                'Teknisi',
            ],
        ]);
    }

    /**
     * Store a newly created employee/user in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $isPns = $request->input('jenis_pegawai') === 'PNS';

        $request->validate([
            'jenis_pegawai' => ['required', Rule::in(['PNS', 'PPNPN'])],
            'nama' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', 'unique:pegawai,email'],
            'password' => ['nullable', 'string', 'min:6'],
            'nip' => [$isPns ? 'required' : 'nullable', 'string', 'max:50', 'unique:pegawai,nip'],
            'pangkat' => ['nullable', 'string', 'max:255'],
            'golongan' => ['nullable', 'string', 'max:50'],
            'role' => ['nullable', 'string', 'max:255'],
            'jabatan' => ['nullable', 'string', 'max:255'],
            'tanggal_masuk_kerja' => ['nullable', 'date'],
        ]);

        $passwordRaw = $request->input('password') ?: 'bmkg1234';

        Pegawai::create([
            'jenis_pegawai' => $request->input('jenis_pegawai'),
            'nama' => trim($request->input('nama')),
            'email' => $request->input('email') ? trim(strtolower($request->input('email'))) : null,
            'password' => Hash::make($passwordRaw),
            'nip' => $isPns && $request->input('nip') ? trim($request->input('nip')) : null,
            'pangkat' => $isPns && $request->input('pangkat') ? trim($request->input('pangkat')) : null,
            'golongan' => $isPns && $request->input('golongan') ? trim($request->input('golongan')) : null,
            'role' => $request->input('role') ? trim($request->input('role')) : ($isPns ? null : 'PPNPN'),
            'jabatan' => $isPns && $request->input('jabatan') ? trim($request->input('jabatan')) : null,
            'tanggal_masuk_kerja' => $request->input('tanggal_masuk_kerja') ?: null,
            'is_active' => true,
        ]);

        return redirect()->back()->with('success', 'Data pegawai & akun login berhasil ditambahkan.');
    }

    /**
     * Update the specified employee in storage.
     */
    public function update(Request $request, Pegawai $pegawai): RedirectResponse
    {
        $isPns = $request->input('jenis_pegawai') === 'PNS';

        $request->validate([
            'jenis_pegawai' => ['required', Rule::in(['PNS', 'PPNPN'])],
            'nama' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('pegawai', 'email')->ignore($pegawai->id)],
            'password' => ['nullable', 'string', 'min:6'],
            'nip' => [$isPns ? 'required' : 'nullable', 'string', 'max:50', Rule::unique('pegawai', 'nip')->ignore($pegawai->id)],
            'pangkat' => ['nullable', 'string', 'max:255'],
            'golongan' => ['nullable', 'string', 'max:50'],
            'role' => ['nullable', 'string', 'max:255'],
            'jabatan' => ['nullable', 'string', 'max:255'],
            'tanggal_masuk_kerja' => ['nullable', 'date'],
        ]);

        $updateData = [
            'jenis_pegawai' => $request->input('jenis_pegawai'),
            'nama' => trim($request->input('nama')),
            'email' => $request->input('email') ? trim(strtolower($request->input('email'))) : null,
            'nip' => $isPns && $request->input('nip') ? trim($request->input('nip')) : null,
            'pangkat' => $isPns && $request->input('pangkat') ? trim($request->input('pangkat')) : null,
            'golongan' => $isPns && $request->input('golongan') ? trim($request->input('golongan')) : null,
            'role' => $request->input('role') ? trim($request->input('role')) : ($isPns ? null : 'PPNPN'),
            'jabatan' => $isPns && $request->input('jabatan') ? trim($request->input('jabatan')) : null,
            'tanggal_masuk_kerja' => $request->input('tanggal_masuk_kerja') ?: null,
        ];

        if ($request->filled('password')) {
            $updateData['password'] = Hash::make($request->input('password'));
        }

        $pegawai->update($updateData);

        return redirect()->back()->with('success', 'Data pegawai & akun login berhasil diperbarui.');
    }

    /**
     * Remove the specified employee from storage.
     */
    public function destroy(Pegawai $pegawai): RedirectResponse
    {
        $pegawai->delete();

        return redirect()->back()->with('success', 'Data pegawai berhasil dihapus.');
    }
}

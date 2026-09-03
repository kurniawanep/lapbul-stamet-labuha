<?php

namespace App\Http\Controllers\Admin;

use App\Enums\RolePermission;
use App\Http\Controllers\Controller;
use App\Models\Pegawai;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HakAksesController extends Controller
{
    /**
     * Display a listing of employees and their access rights.
     */
    public function index(Request $request): Response
    {
        $search = $request->input('search');
        $jenis = $request->input('jenis');
        $roleFilter = $request->input('role');

        $pegawais = Pegawai::query()
            ->when($search, function ($query, $search) {
                $query->where('nama', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('nip', 'like', "%{$search}%")
                    ->orWhere('role', 'like', "%{$search}%");
            })
            ->when($jenis, function ($query, $jenis) {
                $query->where('jenis_pegawai', $jenis);
            })
            ->when($roleFilter, function ($query, $roleFilter) {
                $query->where('role', $roleFilter);
            })
            ->orderByDesc('is_superadmin')
            ->orderBy('jenis_pegawai')
            ->orderBy('nama')
            ->get();

        $rolesPns = [
            'Kepala Stasiun',
            'Tata Usaha',
            'Observer & Forecaster',
            'Teknisi',
        ];

        $roleDefaults = [];
        foreach (array_merge($rolesPns, ['PPNPN']) as $roleName) {
            $roleDefaults[$roleName] = RolePermission::roleDefaults($roleName);
        }

        return Inertia::render('Admin/HakAkses', [
            'pegawais' => $pegawais,
            'filters' => [
                'search' => $search,
                'jenis' => $jenis,
                'role' => $roleFilter,
            ],
            'allPermissions' => RolePermission::all(),
            'allPermissionKeys' => RolePermission::allKeys(),
            'roleDefaults' => $roleDefaults,
            'rolesPns' => $rolesPns,
        ]);
    }

    /**
     * Update access rights (permissions & superadmin status) for a specific employee.
     */
    public function update(Request $request, Pegawai $pegawai): RedirectResponse
    {
        $validated = $request->validate([
            'is_superadmin' => 'required|boolean',
            'is_custom' => 'required|boolean',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string',
        ]);

        $currentUser = $request->user();

        // Prevent current super admin from accidentally revoking their own superadmin privilege
        if ($currentUser->id === $pegawai->id && ! $validated['is_superadmin'] && $pegawai->is_superadmin) {
            $superAdminCount = Pegawai::where('is_superadmin', true)->count();
            if ($superAdminCount <= 1) {
                return back()->with('error', 'Anda tidak dapat mencabut hak Super Admin dari akun Anda sendiri karena Anda adalah satu-satunya Super Admin aktif.');
            }
        }

        $pegawai->is_superadmin = (bool) $validated['is_superadmin'];

        // If is_custom is true, save the selected permissions array; otherwise set to null to follow role defaults
        if ($validated['is_custom']) {
            $validKeys = RolePermission::allKeys();
            $filteredPermissions = array_values(array_intersect($validated['permissions'] ?? [], $validKeys));
            $pegawai->permissions = $filteredPermissions;
        } else {
            $pegawai->permissions = null;
        }

        $pegawai->save();

        return back()->with('success', "Hak akses untuk {$pegawai->nama} berhasil diperbarui.");
    }

    /**
     * Reset employee access rights to follow role defaults.
     */
    public function reset(Request $request, Pegawai $pegawai): RedirectResponse
    {
        $pegawai->permissions = null;
        $pegawai->save();

        return back()->with('success', "Hak akses untuk {$pegawai->nama} berhasil direset ke Default Role ({$pegawai->role}).");
    }
}

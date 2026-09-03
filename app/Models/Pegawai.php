<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Passkeys\Passkeys;

class Pegawai extends Authenticatable implements PasskeyUser
{
    use HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'pegawai';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'nama',
        'email',
        'password',
        'jenis_pegawai',
        'nip',
        'pangkat',
        'golongan',
        'role',
        'is_superadmin',
        'permissions',
        'jabatan',
        'tanggal_masuk_kerja',
        'is_active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = ['name', 'effective_permissions'];

    /**
     * Accessor for 'name' to satisfy frontend user.name expected property.
     */
    public function getNameAttribute(): string
    {
        return $this->attributes['nama'] ?? '';
    }

    /**
     * Get effective permissions for the user (custom or role defaults).
     */
    public function getEffectivePermissionsAttribute(): array
    {
        return $this->getEffectivePermissions();
    }

    /**
     * Determine whether the user is a super admin.
     */
    public function isSuperAdmin(): bool
    {
        return (bool) ($this->is_superadmin ?? false) || ($this->role === 'Super Admin');
    }

    /**
     * Check whether user has specific permission.
     */
    public function hasPermission(string|array $permission): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $effective = $this->getEffectivePermissions();

        if (is_array($permission)) {
            foreach ($permission as $p) {
                if (in_array($p, $effective, true)) {
                    return true;
                }
            }
            return false;
        }

        return in_array($permission, $effective, true);
    }

    /**
     * Return active permissions list.
     */
    public function getEffectivePermissions(): array
    {
        if ($this->isSuperAdmin()) {
            return \App\Enums\RolePermission::allKeys();
        }

        // If custom permissions array is set (not null), use it directly
        if ($this->permissions !== null) {
            return is_array($this->permissions) ? $this->permissions : [];
        }

        // Otherwise fallback to default permissions of the user's role
        return \App\Enums\RolePermission::roleDefaults($this->role);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'tanggal_masuk_kerja' => 'date:Y-m-d',
            'is_active' => 'boolean',
            'is_superadmin' => 'boolean',
            'permissions' => 'array',
        ];
    }

    public function jadwalDetails(): HasMany
    {
        return $this->hasMany(JadwalDetail::class, 'pegawai_id');
    }

    /**
     * Override passkeys() relation to use correct foreign key 'user_id'
     * instead of the default 'pegawai_id' inferred from the table name.
     */
    public function passkeys(): HasMany
    {
        return $this->hasMany(Passkeys::passkeyModel(), 'user_id');
    }
}

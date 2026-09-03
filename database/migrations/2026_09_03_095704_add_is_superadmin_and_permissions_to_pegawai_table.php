<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pegawai', function (Blueprint $table) {
            $table->boolean('is_superadmin')->default(false)->after('role');
            $table->json('permissions')->nullable()->after('is_superadmin');
        });

        // Set user k.ekoptr@gmail.com sebagai Super Admin awal
        DB::table('pegawai')
            ->where('email', 'k.ekoptr@gmail.com')
            ->orWhere('email', 'like', 'k.ekoptr%')
            ->update([
                'is_superadmin' => true,
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pegawai', function (Blueprint $table) {
            $table->dropColumn(['is_superadmin', 'permissions']);
        });
    }
};

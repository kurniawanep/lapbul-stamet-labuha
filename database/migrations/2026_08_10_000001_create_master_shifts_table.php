<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('master_shifts', function (Blueprint $table) {
            $table->id();
            $table->string('category')->default('operasional'); // 'operasional', 'teknisi', 'ppnpn'
            $table->string('kode_shift');
            $table->string('nama_shift');
            $table->time('jam_masuk')->nullable();
            $table->time('jam_keluar')->nullable();
            $table->boolean('is_tidak_masuk_kerja')->default(false);
            $table->timestamps();

            $table->unique(['kode_shift', 'category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('master_shifts');
    }
};

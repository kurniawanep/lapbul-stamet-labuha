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
        Schema::create('jadwal_bulanan_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('jadwal_bulanan_id')->constrained('jadwal_bulanans')->cascadeOnDelete();
            $table->foreignId('master_shift_id')->nullable()->constrained('master_shifts')->nullOnDelete();
            $table->string('category')->default('operasional');
            $table->string('kode_shift');
            $table->string('nama_shift');
            $table->time('jam_masuk')->nullable();
            $table->time('jam_keluar')->nullable();
            $table->boolean('is_tidak_masuk_kerja')->default(false);
            $table->timestamps();

            $table->unique(['jadwal_bulanan_id', 'category', 'kode_shift']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jadwal_bulanan_shifts');
    }
};

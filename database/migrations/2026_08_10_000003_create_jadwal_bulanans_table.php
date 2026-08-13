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
        Schema::create('jadwal_bulanans', function (Blueprint $table) {
            $table->id();
            $table->integer('bulan');
            $table->integer('tahun');
            $table->string('stasiun')->default('Stasiun Meteorologi Oesman Sadik Halmahera Selatan');
            $table->string('zona_waktu')->default('WIT');
            $table->string('kepala_stasiun_nama')->default('BEN ARTHER MOLLE');
            $table->string('kepala_pokjung_nama')->default('MUHD. YUSRAN TITDOY BADER');
            $table->timestamps();

            $table->unique(['bulan', 'tahun']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jadwal_bulanans');
    }
};

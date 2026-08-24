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
        Schema::create('data_perawanan', function (Blueprint $table) {
            $table->id();
            $table->integer('station_id')->default(138);
            $table->string('station_name')->nullable()->default('Stasiun Meteorologi Oesman Sadik');
            $table->dateTime('data_timestamp');
            $table->integer('clear')->default(0);
            $table->integer('partly_cloudy')->default(0);
            $table->integer('cloudy')->default(0);
            $table->integer('totally_cloudy')->default(0);
            $table->integer('total_observation')->default(24);
            $table->text('notes')->nullable();
            $table->string('observer_name')->nullable();
            $table->foreignId('pegawai_id')->nullable()->constrained('pegawai')->nullOnDelete();
            $table->timestamps();

            $table->unique(['station_id', 'data_timestamp'], 'perawanan_station_timestamp_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('data_perawanan');
    }
};

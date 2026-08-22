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
        Schema::create('data_pibal', function (Blueprint $table) {
            $table->id();
            $table->integer('station_id')->default(138);
            $table->integer('alias_station_id')->default(97460);
            $table->string('station_name')->default('Stasiun Meteorologi Oesman Sadik');
            $table->dateTime('data_timestamp')->unique();
            $table->dateTime('received_timestamp')->nullable();
            $table->dateTime('sent_timestamp')->nullable();
            $table->float('delta_min')->nullable();
            $table->string('monitoring_status')->nullable();
            $table->integer('delay_minutes')->default(0);
            $table->string('observer_name')->nullable();
            $table->foreignId('pegawai_id')->nullable()->constrained('pegawai')->nullOnDelete();
            $table->decimal('wind_dir_surface', 5, 1)->nullable();
            $table->decimal('wind_speed_surface', 5, 1)->nullable();
            $table->string('station_elevation')->nullable();
            $table->text('sandi_pibal')->nullable();
            $table->string('penghentian_pengamatan')->nullable();
            $table->json('pembacaan_azimuth_elevasi')->nullable();
            $table->json('hasil_lapisan_wd_ws_dddff')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('data_pibal');
    }
};

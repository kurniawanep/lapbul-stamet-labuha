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
        Schema::create('data_sinoptik', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('station_id')->default(138);
            $table->string('station_name')->default('Stasiun Meteorologi Oesman Sadik');
            $table->dateTime('data_timestamp')->index();
            $table->dateTime('received_timestamp')->nullable();
            $table->dateTime('sent_timestamp')->nullable();
            $table->text('sandi')->nullable();
            
            // Key Synoptic Meteorological Parameters
            $table->float('temp_drybulb')->nullable();
            $table->float('temp_max')->nullable();
            $table->float('temp_min')->nullable();
            $table->float('temp_wetbulb')->nullable();
            $table->float('temp_dewpoint')->nullable();
            $table->float('humidity')->nullable();
            $table->float('pressure_qff')->nullable();
            $table->float('pressure_qfe')->nullable();
            $table->float('wind_dir')->nullable();
            $table->float('wind_speed')->nullable();
            $table->float('visibility')->nullable();
            $table->float('rainfall')->nullable();
            $table->string('cloud_cover')->nullable();

            $table->string('observer_name')->nullable();
            $table->foreignId('pegawai_id')->nullable()->constrained('pegawai')->nullOnDelete();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('data_sinoptik');
    }
};

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
        Schema::create('data_met_report', function (Blueprint $table) {
            $table->id();
            $table->string('station_code')->default('WAEL');
            $table->string('station_name')->default('Oesman Sadik Airport (WAEL)');
            $table->dateTime('data_timestamp')->index();
            
            // Parameters from MET REPORT (QAM)
            $table->string('wind')->nullable();
            $table->string('visibility')->nullable();
            $table->string('weather')->nullable();
            $table->string('cloud')->nullable();
            
            $table->float('temp_drybulb')->nullable(); // TT (°C)
            $table->float('temp_dewpoint')->nullable(); // TD (°C)
            
            $table->float('qnh_hpa')->nullable();
            $table->float('qnh_inhg')->nullable();
            $table->float('qfe_hpa')->nullable();
            $table->float('qfe_inhg')->nullable();
            
            $table->string('remarks')->nullable();
            $table->string('trend')->nullable();
            $table->text('raw_message')->nullable();
            
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
        Schema::dropIfExists('data_met_report');
    }
};

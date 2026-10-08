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
        Schema::create('data_flights', function (Blueprint $table) {
            $table->id();
            $table->date('tanggal')->index();
            $table->string('maskapai')->default('Wings Air')->index();
            $table->string('flight_number')->index();
            $table->string('reg', 20)->nullable()->index(); // Aircraft registration (e.g. PK-WJY)
            $table->string('dep', 10)->nullable()->index(); // Departure airport code (e.g. LAH, TTE)
            $table->string('arr', 10)->nullable()->index(); // Arrival airport code (e.g. TTE, LAH)
            $table->string('sta_utc', 10)->nullable(); // Scheduled Time Arrival UTC (e.g. 07:10)
            $table->string('std_utc', 10)->nullable(); // Scheduled Time Departure UTC (e.g. 22:35)
            $table->string('ata_utc', 10)->nullable(); // Actual Time Arrival UTC (e.g. 07:02)
            $table->string('atd_utc', 10)->nullable(); // Actual Time Departure UTC (e.g. 22:35)
            $table->text('remarks')->nullable();
            $table->foreignId('pegawai_id')->nullable()->constrained('pegawai')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('data_flights');
    }
};

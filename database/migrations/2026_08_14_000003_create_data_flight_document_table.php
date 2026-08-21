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
        Schema::create('data_flight_document', function (Blueprint $table) {
            $table->id();
            $table->string('station_code')->default('WAEL');
            $table->string('inasiam_fd_id')->nullable()->index();
            $table->string('no_fd')->nullable();
            $table->string('flight_number')->nullable();
            $table->string('airline_name')->nullable();
            $table->string('route')->nullable();
            $table->dateTime('departure_at')->nullable()->index();
            $table->dateTime('issued_at')->nullable();
            $table->string('flight_level')->nullable();
            $table->string('type')->nullable(); // e.g. Terjadwal, Sesuai Permintaan
            $table->string('status')->nullable(); // e.g. Selesai, Draft
            $table->text('fd_url')->nullable();
            
            // WA Dispatch Audit Fields
            $table->boolean('is_wa_dispatched')->default(false)->index();
            $table->dateTime('wa_dispatched_at')->nullable();
            $table->string('wa_sender_name')->nullable();
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
        Schema::dropIfExists('data_flight_document');
    }
};

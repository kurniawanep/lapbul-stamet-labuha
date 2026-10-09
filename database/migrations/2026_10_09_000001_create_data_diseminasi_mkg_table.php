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
        Schema::create('data_diseminasi_mkg', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('simpan_mkg_id')->unique()->index();
            $table->dateTime('dissemination_timestamp')->index();
            $table->foreignId('pegawai_id')->nullable()->constrained('pegawai')->nullOnDelete();
            $table->foreignId('shift_id')->nullable()->constrained('jadwal_bulanan_shifts')->nullOnDelete();
            $table->string('shift_kode', 20)->nullable()->index();
            $table->string('shift_nama')->nullable();
            $table->string('media_type', 30)->default('image')->index();
            $table->text('message')->nullable();
            $table->json('platforms')->nullable();
            $table->string('status', 30)->default('success')->index();
            $table->string('sender_wa', 50)->nullable();
            $table->string('sender_name')->nullable();
            $table->boolean('is_registered')->default(false);
            $table->text('media_url')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('data_diseminasi_mkg');
    }
};

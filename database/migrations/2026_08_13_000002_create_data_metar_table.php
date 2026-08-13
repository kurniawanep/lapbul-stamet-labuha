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
        Schema::create('data_metar', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('bmkgsoft_entry_id')->nullable()->index();
            $table->integer('station_id')->default(138);
            $table->integer('alias_station_id')->nullable()->default(97460);
            $table->string('station_wmo_id')->nullable();
            $table->string('station_name')->nullable();
            $table->string('cccc', 10)->nullable()->index();
            $table->string('ttaaii', 20)->nullable();
            $table->string('type_message', 20)->nullable();
            $table->string('bbb', 10)->nullable();
            $table->timestamp('data_timestamp')->index();
            $table->timestamp('received_timestamp')->nullable();
            $table->timestamp('sent_timestamp')->nullable();
            $table->text('sandi')->nullable();
            $table->string('status', 50)->nullable();
            $table->string('sender_username', 100)->nullable();
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
        Schema::dropIfExists('data_metar');
    }
};

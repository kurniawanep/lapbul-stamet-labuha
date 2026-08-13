<?php

namespace App\Models;

/**
 * Class User
 * Alias / Extension of Pegawai model for system authentication compatibility.
 */
class User extends Pegawai
{
    protected $table = 'pegawai';
}

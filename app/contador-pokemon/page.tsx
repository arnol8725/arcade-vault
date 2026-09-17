"use client";

import { useState } from "react";
import Image from "next/image";

const TOTAL_POKEMON = 1025;

function spriteUrl(pokedexId: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokedexId}.png`;
}

export default function ContadorPokemon() {
  const [count, setCount] = useState(1);
  const pokedexId = ((count - 1) % TOTAL_POKEMON) + 1;

  return (
    <div className="pokemon-counter fade-in">
      <div className="kicker pixel neon-cyan">▸ CONTADOR</div>
      <h1 className="pokemon-counter-title">CONTADOR POKÉMON</h1>

      <button
        type="button"
        className="pokemon-counter-frame"
        onClick={() => setCount((c) => c + 1)}
        aria-label="Sumar uno al contador"
      >
        <Image
          key={pokedexId}
          src={spriteUrl(pokedexId)}
          alt={`Pokémon #${pokedexId}`}
          width={320}
          height={320}
          className="pokemon-counter-img"
          priority
        />
        <span className="pokemon-counter-dex pixel neon-yellow">
          #{String(pokedexId).padStart(4, "0")}
        </span>
      </button>

      <div className="pokemon-counter-value pixel neon-magenta">{count}</div>

      <button
        type="button"
        className="btn xl"
        onClick={() => setCount((c) => c + 1)}
      >
        CLIC PARA SUMAR
      </button>
    </div>
  );
}

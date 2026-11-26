# Mecánicas del cazador

## Rotación al subir de nivel
**Antes de nivel 10 (sin mascota):**
1. Aspect of the Monkey.
2. Abre con Auto Shot desde la máxima distancia.
3. Serpent Sting → Arcane Shot → Concussive Shot (desde 8).
4. Aléjate entre disparos (kiting). Usa Raptor Strike solo si te alcanzan.

**Desde 10 (Beast Mastery):**
1. Aspect of the Hawk.
2. Manda la mascota y **deja que pegue un par de golpes** antes de disparar, para que no se te giren los enemigos.
3. Auto Shot + Serpent Sting (solo en enemigos que duren) → Aimed Shot y Multi-Shot (comparten tiempo de reutilización) → Arcane Shot.
4. **Desde 25:** mantén siempre dos Summon Hawk fuera. Arcane Shot comparte 6 s de reutilización con Summon Hawk, así que úsalo poco.
5. **Desde 40:** Bestial Wrath y Rapid Fire en peleas largas o en PvP.
6. Si la mascota pierde la amenaza (aggro): Wing Clip, Concussive Shot o Frost Trap, y aléjate.
7. Usa Mend Pet contra elites y Feign Death (desde 30) para salir de combate.

## Zona muerta
- Entre el cuerpo a cuerpo y unas **8 yardas** no puedes disparar.
- Sal de ella con Wing Clip, Disengage o Frost Trap, y aléjate andando.

## Cambios de Forever que te afectan
- **Auto Shot** necesita que estés **quieto 0,5 s** para empezar.
- **Todas las trampas comparten un tiempo de reutilización de 30 s** y se pueden usar en combate.
- Mejoras al lanzamiento: Aimed Shot hace un 110 % más de daño extra, Arcane Shot un 30 % más de daño base y Serpent Sting escala mejor con Attack Power.
- **Hunter's Mark** no se puede poner varias veces usando rangos distintos.
- Las mascotas ya no pierden su velocidad de ataque innata al desentrenarse.
- Los enraizamientos que salen por proc (Entrapment, Improved Wing Clip, Counterattack) tienen rendimientos decrecientes.
- **Racial del troll:** Berserking da solo un 10 % plano de velocidad de ataque y de lanzamiento. Se elimina Bow Specialization. Rapid Regeneration es una canalización nueva para curarte: tienes que estar quieto y se cancela si te pegan. Beast Slaying sigue (+5 % de daño contra bestias). Regeneration no cambia.

## Munición y carcaj
- La munición **sigue existiendo**. El carcaj (Quiver) o la bolsa de munición (Ammo Pouch) ocupa un hueco de bolsa.
- **Lleva siempre munición de sobra** y repón en cada vendedor. Arcos y ballestas usan flechas; rifles, balas.
- Engineering fabrica munición.
- Entre munición, carcaj y comida de la mascota las bolsas se llenan enseguida. Compra bolsas grandes en cuanto puedas y usa la bolsa de componentes de Forever.

## Macros (copiar tal cual)
```
#showtooltip
/targetenemy [noexists][dead][help]
/cast !Auto Shot
```
```
#showtooltip
/petattack [@mouseover,harm,nodead][]
```
```
#showtooltip
/cast [@mouseover,harm][]Hunter's Mark
```
Mascota todo en uno (Mend Pet si está viva, Revive Pet si está muerta y Call Pet si no está):
```
#showtooltip
/use [@pet,nodead,exists] Mend Pet
/stopmacro [@pet,nodead,exists]
/use [@pet,dead,exists] Revive Pet
/castsequence reset=2 Call Pet, Revive Pet
```
```
#showtooltip
/cast [@cursor] !Eagle Eye
```

## Misiones de clase
- **Nivel 10:** "Taming the Beast" (Thotar, Razor Hill) → tres bestias de práctica → "Training the Beast" (Ormak Grimshot, Orgrimmar). Ver [mascotas.md](mascotas.md).
- Las guías de Forever no mencionan más misiones de clase durante el leveo. Si aparece alguna en el juego, apúntala aquí.

## Aspectos
Solo puede haber uno activo a la vez:
- **Hawk:** Attack Power a distancia. Es el normal.
- **Monkey:** +8 % de esquivar. Para domar o si te pegan cuerpo a cuerpo.
- **Cheetah:** +30 % de velocidad, pero te aturde si te golpean. Para viajar.
- **Pack:** como Cheetah, pero para todo el grupo.
- **Beast:** Attack Power cuerpo a cuerpo.
- **Wild:** resistencia a la naturaleza.

Fuentes:
- Warcraft Tavern, guía de cazador: https://warcrafttavern.com/forever/guides/hunter/
- Warcraft Tavern, cambios antes del lanzamiento: https://www.warcrafttavern.com/forever/news/wow-forever-pre-launch-class-changes-bug-fixes/
- Warcraft Tavern, raciales del troll: https://www.warcrafttavern.com/forever/guides/troll-racials/
- Method: https://www.method.gg/wow-forever/wow-forever-hunter-leveling-guide-and-talents

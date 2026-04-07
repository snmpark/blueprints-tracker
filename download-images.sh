#!/bin/bash

# Download blueprint images from Arc Raiders wiki
IMAGES_DIR="./public/images/blueprints"
mkdir -p "$IMAGES_DIR"

# Blueprint names and IDs
declare -A blueprints=(
  [1]="Anvil"
  [2]="Angled_Grip_II"
  [3]="Angled_Grip_III"
  [4]="Aphelion"
  [5]="Barricade_Kit"
  [6]="Bettina"
  [7]="Blaze_Grenade"
  [8]="Bobcat"
  [9]="Burletta"
  [10]="Canto"
  [11]="Combat_Mk._3_(Aggressive)"
  [12]="Combat_Mk._3_(Flanking)"
  [13]="Compensator_II"
  [14]="Compensator_III"
  [15]="Complex_Gun_Parts"
  [16]="Dolabra"
  [17]="Deadline"
  [18]="Defibrillator"
  [19]="Explosive_Mine"
  [20]="Extended_Barrel"
  [21]="Extended_Light_Magazine_II"
  [22]="Extended_Light_Magazine_III"
  [23]="Extended_Medium_Magazine_II"
  [24]="Extended_Medium_Magazine_III"
  [25]="Extended_Shotgun_Magazine_II"
  [26]="Extended_Shotgun_Magazine_III"
  [27]="Equalizer"
  [28]="Fireworks_Box"
  [29]="Gas_Mine"
  [30]="Heavy_Gun_Parts"
  [31]="Hullcracker"
  [32]="Il_Toro"
  [33]="Jolt_Mine"
  [34]="Jupiter"
  [35]="Light_Gun_Parts"
  [36]="Red_Light_Stick"
  [37]="Green_Light_Stick"
  [38]="Yellow_Light_Stick"
  [39]="Blue_Light_Stick"
  [40]="Lightweight_Stock"
  [41]="Looting_Mk._3_(Safekeeper)"
  [42]="Looting_Mk._3_(Survivor)"
  [43]="Lure_Grenade"
  [44]="Medium_Gun_Parts"
  [45]="Muzzle_Brake_II"
  [46]="Muzzle_Brake_III"
  [47]="Osprey"
  [48]="Padded_Stock"
  [49]="Pulse_Mine"
  [50]="Remote_Raider_Flare"
  [51]="Seeker_Grenade"
  [52]="Shotgun_Choke_II"
  [53]="Shotgun_Choke_III"
  [54]="Shotgun_Silencer"
  [55]="Showstopper"
  [56]="Silencer_I"
  [57]="Silencer_II"
  [58]="Smoke_Grenade"
  [59]="Snap_Hook"
  [60]="Stable_Stock_II"
  [61]="Stable_Stock_III"
  [62]="Surge_Coil"
  [63]="Tactical_Mk._3_(Defensive)"
  [64]="Tactical_Mk._3_(Healing)"
  [65]="Tactical_Mk._3_(Revival)"
  [66]="Tagging_Grenade"
  [67]="Tempest"
  [68]="Torrente"
  [69]="Trailblazer"
  [70]="Trigger_'Nade"
  [71]="Venator"
  [72]="Vertical_Grip_II"
  [73]="Vertical_Grip_III"
  [74]="Vita_Shot"
  [75]="Vita_Spray"
  [76]="Vulcano"
  [77]="Wolfpack"
)

success=0
failed=0

for id in $(seq 1 77); do
  name="${blueprints[$id]}"
  wiki_url="https://arcraiders.wiki/wiki/${name}"

  # Get wiki page and extract first main image URL
  html=$(curl -s "$wiki_url")

  # Extract first non-thumb, non-icon image URL
  image_url=$(echo "$html" | grep -oE '/w/images/[^"]+\.(png|jpg)' | grep -v 'thumb' | grep -v 'Icon_' | head -1)

  if [ -n "$image_url" ]; then
    full_url="https://arcraiders.wiki${image_url}"
    ext="${image_url##*.}"
    output_file="${IMAGES_DIR}/${id}.${ext}"

    # Download image
    if curl -s -o "$output_file" "$full_url"; then
      echo "✓ $id/77 - $name"
      ((success++))
    else
      echo "✗ $id/77 - $name (download failed)"
      ((failed++))
    fi
  else
    echo "✗ $id/77 - $name (no image found)"
    ((failed++))
  fi

  sleep 0.1
done

echo ""
echo "Complete!"
echo "  Downloaded: $success/77"
echo "  Failed: $failed/77"


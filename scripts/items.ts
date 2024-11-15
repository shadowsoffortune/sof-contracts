const inputItems = [
    {
        id: 1,
        name: "Test Sword",
        itemType: 0, // ItemType.Weapon
        damage: 10,
        defense: 0,
        durability: 100,
        damageType: "Physical",
        armorType: "",
        modifierIds: []
    },
    {
        id: 2,
        name: "Test Shield",
        itemType: 1, // ItemType.Armor
        damage: 0,
        defense: 5,
        durability: 80,
        damageType: "",
        armorType: "Heavy",
        modifierIds: []
    },
    {
        id: 3,
        name: "Healing Potion",
        itemType: 2, // ItemType.Consumable
        damage: 0,
        defense: 0,
        durability: 0,
        damageType: "",
        armorType: "",
        modifierIds: []
    }
];

export default inputItems;
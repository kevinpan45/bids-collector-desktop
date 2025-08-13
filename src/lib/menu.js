let menus = [
    { 
        name: "dashboard", 
        link: "/", 
        alias: "Dashboard", 
        icon: "dashboard", 
        enabled: true 
    },
    { 
        name: "dataset", 
        link: "/dataset", 
        alias: "Datasets", 
        icon: "dataset", 
        enabled: true 
    },
    { 
        name: "collection", 
        link: "/collection", 
        alias: "Collections", 
        icon: "download", 
        enabled: true 
    },
    { 
        name: "storage", 
        link: "/storage", 
        alias: "Storage", 
        icon: "storage", 
        enabled: true 
    },
    { 
        name: "settings", 
        link: "/settings", 
        alias: "Settings", 
        icon: "settings", 
        enabled: true 
    }
];

export function getMenus() {
    return menus;
}

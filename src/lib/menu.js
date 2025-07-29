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
        name: "storage", 
        link: "/storage", 
        alias: "Storage", 
        icon: "storage", 
        enabled: true 
    }
];

export function getMenus() {
    return menus;
}

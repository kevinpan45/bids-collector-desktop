let menus = [
    { 
        name: "dashboard", 
        link: "/", 
        alias: "Dashboard", 
        icon: "heroicons:home", 
        enabled: true 
    },
    { 
        name: "dataset", 
        link: "/dataset", 
        alias: "Datasets", 
        icon: "heroicons:folder-open", 
        enabled: true 
    },
    { 
        name: "storage", 
        link: "/storage", 
        alias: "Storage", 
        icon: "heroicons:server", 
        enabled: true 
    }
];

export function getMenus() {
    return menus;
}

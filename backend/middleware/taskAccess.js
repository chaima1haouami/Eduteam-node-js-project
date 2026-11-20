/* Rôles de ProjectMember autorisés à gérer TOUTES les tâches
   (créer avec attribution, modifier, supprimer).
   Valeurs possibles dans votre projet : "chef", "membre", "encadrant".
   Ici seul le chef de projet gère ; l'encadrant peut consulter. */
export const MANAGER_ROLES = ["chef"];

// Id de l'utilisateur connecté (le JWT contient `id`)
export const getUserId = (req) => String(req.user.id ?? req.user._id);

// À placer APRÈS projectRole() qui définit req.membership
export function setManagerFlag(req, res, next) {
  req.isManager = MANAGER_ROLES.includes(req.membership.role);
  next();
}

// Nom affichable d'un utilisateur, quel que soit le nom du champ dans User
export function displayName(u) {
  if (!u) return null;
  return (
    u.name ||
    [u.prenom, u.nom].filter(Boolean).join(" ") ||
    u.nom ||
    u.username ||
    u.email ||
    "Utilisateur"
  );
}
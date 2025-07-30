// Sistema de permissões para controle de status
export interface UserPermissions {
  canChangeToNovo: boolean;
  canChangeToAndamento: boolean;
  canChangeToPendente: boolean;
  canChangeToConcluido: boolean;
  canEditAllCases: boolean;
  canDeleteCases: boolean;
}

export function getUserPermissions(user: any): UserPermissions {
  if (!user) {
    return {
      canChangeToNovo: false,
      canChangeToAndamento: false,
      canChangeToPendente: false,
      canChangeToConcluido: false,
      canEditAllCases: false,
      canDeleteCases: false,
    };
  }

  // Administrador tem todas as permissões
  if (user.role === 'admin') {
    return {
      canChangeToNovo: true,
      canChangeToAndamento: true,
      canChangeToPendente: true,
      canChangeToConcluido: true,
      canEditAllCases: true,
      canDeleteCases: true,
    };
  }

  // Permissões específicas para lucas.silva
  if (user.username === 'lucas.silva') {
    return {
      canChangeToNovo: false,
      canChangeToAndamento: true, // Pode reabrir processos
      canChangeToPendente: false,
      canChangeToConcluido: true, // Pode marcar como concluído
      canEditAllCases: false,
      canDeleteCases: false,
    };
  }

  // Editores padrão
  if (user.role === 'editor') {
    return {
      canChangeToNovo: false,
      canChangeToAndamento: true,
      canChangeToPendente: false,
      canChangeToConcluido: true,
      canEditAllCases: false,
      canDeleteCases: false,
    };
  }

  // Usuários sem permissões específicas
  return {
    canChangeToNovo: false,
    canChangeToAndamento: false,
    canChangeToPendente: false,
    canChangeToConcluido: true, // Todos podem marcar como concluído
    canEditAllCases: false,
    canDeleteCases: false,
  };
}

export function canChangeStatus(user: any, fromStatus: string, toStatus: string): boolean {
  const permissions = getUserPermissions(user);
  
  switch (toStatus) {
    case 'novo':
      return permissions.canChangeToNovo;
    case 'andamento':
      return permissions.canChangeToAndamento;
    case 'pendente':
      return permissions.canChangeToPendente;
    case 'concluido':
      return permissions.canChangeToConcluido;
    default:
      return false;
  }
}
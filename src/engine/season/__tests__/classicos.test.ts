import {classicoEntre, ehClassico} from '../classicos';

describe('classicoEntre / ehClassico', () => {
  it('reconhece o Fla-Flu em qualquer ordem', () => {
    expect(classicoEntre('club_flamengo', 'club_fluminense')?.nome).toBe(
      'Fla-Flu',
    );
    expect(classicoEntre('club_fluminense', 'club_flamengo')?.nome).toBe(
      'Fla-Flu',
    );
    expect(ehClassico('club_flamengo', 'club_fluminense')).toBe(true);
  });

  it('reconhece o Derby Paulista e o Gre-Nal', () => {
    expect(classicoEntre('club_corinthians', 'club_palmeiras')?.nome).toBe(
      'Derby Paulista',
    );
    expect(classicoEntre('club_gremio', 'club_internacional')?.nome).toBe(
      'Gre-Nal',
    );
  });

  it('não inventa clássico entre clubes sem rivalidade', () => {
    expect(classicoEntre('club_flamengo', 'club_gremio')).toBeNull();
    expect(ehClassico('club_flamengo', 'club_gremio')).toBe(false);
  });

  it('clube contra ele mesmo não é clássico', () => {
    expect(classicoEntre('club_flamengo', 'club_flamengo')).toBeNull();
  });

  it('clube desconhecido não quebra nem inventa clássico', () => {
    expect(classicoEntre('club_flamengo', 'club_inexistente')).toBeNull();
  });

  it('é determinística', () => {
    expect(classicoEntre('club_bahia', 'club_vitoria')).toEqual(
      classicoEntre('club_vitoria', 'club_bahia'),
    );
  });
});
